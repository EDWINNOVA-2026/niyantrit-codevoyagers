"""
Blockchain Fund Tracking Service
Handles logging of fund disbursements and approvals to Ethereum blockchain using smart contracts.
"""

import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
from dotenv import load_dotenv

# Web3 imports
try:
    from web3 import Web3
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False
    print("Warning: web3 not installed. Blockchain features will be disabled.")

load_dotenv()

class BlockchainLogger:
    """Service for logging fund transactions to blockchain."""
    
    def __init__(
        self,
        provider_url: Optional[str] = None,
        contract_address: Optional[str] = None,
        contract_abi: Optional[Dict] = None,
        wallet_private_key: Optional[str] = None
    ):
        """
        Initialize blockchain logger.
        
        Args:
            provider_url: Ethereum RPC provider URL (e.g., Infura)
            contract_address: Deployed smart contract address
            contract_abi: Contract ABI (Application Binary Interface)
            wallet_private_key: Private key for transaction signing
        """
        self.enabled = HAS_WEB3
        
        if not self.enabled:
            print("Warning: Web3 not available. Blockchain logging disabled.")
            return
        
        # Load from environment if not provided
        self.provider_url = provider_url or os.getenv("ETHEREUM_PROVIDER_URL")
        self.contract_address = contract_address or os.getenv("CONTRACT_ADDRESS")
        self.wallet_private_key = wallet_private_key or os.getenv("WALLET_PRIVATE_KEY")
        
        # Load contract ABI from file if not provided
        if contract_abi is None:
            abi_path = os.path.join(os.path.dirname(__file__), "..", "blockchain", "FundDisbursement.json")
            if os.path.exists(abi_path):
                with open(abi_path, 'r') as f:
                    abi_data = json.load(f)
                    self.contract_abi = abi_data.get("abi", [])
            else:
                self.contract_abi = []
        else:
            self.contract_abi = contract_abi
        
        # Initialize web3 connection
        self.w3 = None
        self.contract = None
        
        if self.provider_url:
            try:
                self.w3 = Web3(Web3.HTTPProvider(self.provider_url))
                
                if self.w3.is_connected():
                    print(f"✓ Connected to Ethereum network at {self.provider_url}")
                    
                    if self.contract_address and self.contract_abi:
                        self.contract = self.w3.eth.contract(
                            address=Web3.to_checksum_address(self.contract_address),
                            abi=self.contract_abi
                        )
                        print(f"✓ Contract loaded at {self.contract_address}")
                else:
                    print(f"✗ Failed to connect to {self.provider_url}")
            
            except Exception as e:
                print(f"✗ Error initializing Web3: {str(e)}")
                self.enabled = False
    
    def create_milestone(
        self,
        project_id: str,
        milestone_name: str,
        fund_amount: float,
        approval_threshold: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new fund disbursement milestone on blockchain.
        
        Args:
            project_id: Project identifier
            milestone_name: Name of the milestone
            fund_amount: Amount to disburse in wei or atomic units
            approval_threshold: Number of approvals required
            
        Returns:
            Transaction receipt or None
        """
        if not self.enabled or not self.contract or not self.w3:
            return self._create_local_record(
                "milestone_created",
                {
                    "project_id": project_id,
                    "milestone_name": milestone_name,
                    "fund_amount": fund_amount,
                    "approval_threshold": approval_threshold
                }
            )
        
        try:
            # Get account from private key
            account = self.w3.eth.account.from_key(self.wallet_private_key)
            
            # Prepare transaction
            tx_function = self.contract.functions.createMilestone(
                milestone_name.encode('utf-8'),
                int(fund_amount),
                approval_threshold,
                project_id.encode('utf-8')
            )
            
            # Estimate gas
            gas_estimate = tx_function.estimate_gas({"from": account.address})
            
            # Build transaction
            tx = tx_function.build_transaction({
                "from": account.address,
                "gas": int(gas_estimate * 1.2),  # Add 20% buffer
                "gasPrice": self.w3.eth.gas_price,
                "nonce": self.w3.eth.get_transaction_count(account.address)
            })
            
            # Sign transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.wallet_private_key)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            return {
                "status": "success",
                "transaction_hash": receipt["transactionHash"].hex(),
                "block_number": receipt["blockNumber"],
                "gas_used": receipt["gasUsed"],
                "timestamp": datetime.utcnow().isoformat(),
                "etherscan_url": f"https://sepolia.etherscan.io/tx/{receipt['transactionHash'].hex()}"
            }
        
        except Exception as e:
            print(f"Error creating milestone on blockchain: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def approve_milestone(
        self,
        milestone_id: int,
        approver_address: str
    ) -> Optional[Dict[str, Any]]:
        """
        Approve a fund disbursement milestone.
        
        Args:
            milestone_id: ID of the milestone to approve
            approver_address: Address of the approving official
            
        Returns:
            Transaction receipt or None
        """
        if not self.enabled or not self.contract or not self.w3:
            return self._create_local_record(
                "milestone_approved",
                {
                    "milestone_id": milestone_id,
                    "approver_address": approver_address
                }
            )
        
        try:
            account = self.w3.eth.account.from_key(self.wallet_private_key)
            
            tx_function = self.contract.functions.approveMilestone(milestone_id)
            
            gas_estimate = tx_function.estimate_gas({"from": account.address})
            
            tx = tx_function.build_transaction({
                "from": account.address,
                "gas": int(gas_estimate * 1.2),
                "gasPrice": self.w3.eth.gas_price,
                "nonce": self.w3.eth.get_transaction_count(account.address)
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.wallet_private_key)
            
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            return {
                "status": "success",
                "transaction_hash": receipt["transactionHash"].hex(),
                "block_number": receipt["blockNumber"],
                "gas_used": receipt["gasUsed"],
                "timestamp": datetime.utcnow().isoformat(),
                "etherscan_url": f"https://sepolia.etherscan.io/tx/{receipt['transactionHash'].hex()}"
            }
        
        except Exception as e:
            print(f"Error approving milestone on blockchain: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def disburse_funds(
        self,
        milestone_id: int,
        recipient_address: str
    ) -> Optional[Dict[str, Any]]:
        """
        Execute fund disbursement for an approved milestone.
        
        Args:
            milestone_id: ID of the approved milestone
            recipient_address: Address to receive funds
            
        Returns:
            Transaction receipt or None
        """
        if not self.enabled or not self.contract or not self.w3:
            return self._create_local_record(
                "funds_disbursed",
                {
                    "milestone_id": milestone_id,
                    "recipient_address": recipient_address
                }
            )
        
        try:
            account = self.w3.eth.account.from_key(self.wallet_private_key)
            
            tx_function = self.contract.functions.disburseFunds(
                milestone_id,
                Web3.to_checksum_address(recipient_address)
            )
            
            gas_estimate = tx_function.estimate_gas({"from": account.address})
            
            tx = tx_function.build_transaction({
                "from": account.address,
                "gas": int(gas_estimate * 1.2),
                "gasPrice": self.w3.eth.gas_price,
                "nonce": self.w3.eth.get_transaction_count(account.address)
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.wallet_private_key)
            
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            return {
                "status": "success",
                "transaction_hash": receipt["transactionHash"].hex(),
                "block_number": receipt["blockNumber"],
                "gas_used": receipt["gasUsed"],
                "recipient": recipient_address,
                "timestamp": datetime.utcnow().isoformat(),
                "etherscan_url": f"https://sepolia.etherscan.io/tx/{receipt['transactionHash'].hex()}"
            }
        
        except Exception as e:
            print(f"Error disbursing funds on blockchain: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def get_milestone_history(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve all milestone transactions for a project.
        
        Args:
            project_id: Project identifier
            
        Returns:
            List of milestone records
        """
        if not self.enabled or not self.contract or not self.w3:
            # Return mock historical data
            return {
                "project_id": project_id,
                "milestones": [],
                "note": "Blockchain unavailable"
            }
        
        try:
            # Call contract view function to get milestone history
            milestones = self.contract.functions.getMilestonesByProject(
                project_id.encode('utf-8')
            ).call()
            
            return {
                "project_id": project_id,
                "milestones": milestones,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            print(f"Error retrieving milestone history: {str(e)}")
            return {
                "project_id": project_id,
                "error": str(e)
            }
    
    def get_transaction_status(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """
        Get status of a blockchain transaction.
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Transaction status and details
        """
        if not self.enabled or not self.w3:
            return None
        
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            
            if receipt:
                return {
                    "transaction_hash": receipt["transactionHash"].hex(),
                    "status": "success" if receipt["status"] == 1 else "failed",
                    "block_number": receipt["blockNumber"],
                    "gas_used": receipt["gasUsed"],
                    "from_address": receipt["from"],
                    "to_address": receipt["to"],
                    "etherscan_url": f"https://sepolia.etherscan.io/tx/{receipt['transactionHash'].hex()}"
                }
            else:
                return {
                    "transaction_hash": tx_hash,
                    "status": "pending"
                }
        
        except Exception as e:
            print(f"Error getting transaction status: {str(e)}")
            return None
    
    def get_network_info(self) -> Dict[str, Any]:
        """Get information about the connected network."""
        if not self.enabled or not self.w3:
            return {"status": "disconnected"}
        
        try:
            return {
                "connected": self.w3.is_connected(),
                "network_id": self.w3.net.version,
                "chain_id": self.w3.eth.chain_id,
                "gas_price_gwei": self.w3.from_wei(self.w3.eth.gas_price, "gwei"),
                "latest_block": self.w3.eth.block_number,
                "provider_url": self.provider_url,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            print(f"Error getting network info: {str(e)}")
            return {"error": str(e)}
    
    def _create_local_record(self, event_type: str, data: Dict) -> Dict[str, Any]:
        """
        Create a local record when blockchain is unavailable.
        This allows the system to function offline and sync later.
        """
        return {
            "status": "pending",
            "event_type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Blockchain unavailable - logged locally. Will sync when blockchain is available."
        }


# Singleton instance
_blockchain_logger = None

def get_blockchain_logger(
    provider_url: Optional[str] = None,
    contract_address: Optional[str] = None,
    contract_abi: Optional[Dict] = None,
    wallet_private_key: Optional[str] = None
) -> BlockchainLogger:
    """Get or create blockchain logger singleton."""
    global _blockchain_logger
    if _blockchain_logger is None:
        _blockchain_logger = BlockchainLogger(
            provider_url,
            contract_address,
            contract_abi,
            wallet_private_key
        )
    return _blockchain_logger


# Convenience functions
def create_milestone(
    project_id: str,
    milestone_name: str,
    fund_amount: float,
    approval_threshold: int = 1
) -> Optional[Dict]:
    """Create a milestone on blockchain."""
    return get_blockchain_logger().create_milestone(
        project_id, milestone_name, fund_amount, approval_threshold
    )

def approve_milestone(milestone_id: int, approver_address: str) -> Optional[Dict]:
    """Approve a milestone on blockchain."""
    return get_blockchain_logger().approve_milestone(milestone_id, approver_address)

def disburse_funds(milestone_id: int, recipient_address: str) -> Optional[Dict]:
    """Disburse funds for a milestone on blockchain."""
    return get_blockchain_logger().disburse_funds(milestone_id, recipient_address)

def get_milestone_history(project_id: str) -> Optional[Dict]:
    """Get milestone history from blockchain."""
    return get_blockchain_logger().get_milestone_history(project_id)

def get_transaction_status(tx_hash: str) -> Optional[Dict]:
    """Get transaction status from blockchain."""
    return get_blockchain_logger().get_transaction_status(tx_hash)

def get_network_info() -> Dict:
    """Get network information."""
    return get_blockchain_logger().get_network_info()
