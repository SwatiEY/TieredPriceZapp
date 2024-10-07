// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./verify/IVerifier.sol";
import "./merkle-tree/MerkleTree.sol";

pragma experimental ABIEncoderV2;

contract TieredPricingShield is MerkleTree {


          enum FunctionNames { addPriceTierItem, checkPO, checkInvoice }

          IVerifier private verifier;

          mapping(uint256 => uint256[]) public vks; // indexed to by an enum uint(FunctionNames)

        struct BackupDataElement {
          string varName;
          uint256[] cipherText;
          uint256 ephPublicKey;
      } 

          event EncryptedBackupData(BackupDataElement[] encPreimages); 
          

        mapping(uint256 => uint256) public nullifiers;

          mapping(uint256 => uint256) public commitmentRoots;

          uint256 public latestRoot;

          mapping(address => uint256) public zkpPublicKeys;

          struct Inputs {
            uint[] newNullifiers;
						uint[] checkNullifiers;
						uint commitmentRoot;
						uint[] newCommitments;
						uint[] customInputs;
          }


        function registerZKPPublicKey(uint256 pk) external {
      		zkpPublicKeys[msg.sender] = pk;
      	}
        


        function verify(
      		uint256[] memory proof,
      		uint256 functionId,
      		Inputs memory _inputs
      	) private {
        
          uint[] memory customInputs = _inputs.customInputs;

          uint[] memory newNullifiers = _inputs.newNullifiers;

        uint[] memory checkNullifiers = _inputs.checkNullifiers;

          uint[] memory newCommitments = _inputs.newCommitments;

        for (uint i; i < newNullifiers.length; i++) {
          uint n = newNullifiers[i];
          require(nullifiers[n] == 0, "Nullifier already exists");
          nullifiers[n] = n;
        }

          for (uint i; i < checkNullifiers.length; i++) {
            uint n = checkNullifiers[i];
            require(nullifiers[n] == 0, "Nullifier already exists");
          }

          require(commitmentRoots[_inputs.commitmentRoot] == _inputs.commitmentRoot, "Input commitmentRoot does not exist.");

            uint256[] memory inputs = new uint256[](customInputs.length + newNullifiers.length + checkNullifiers.length + (newNullifiers.length > 0 ? 1 : 0) +(functionId == uint(FunctionNames.checkInvoice) ? 9 : _inputs.newCommitments.length));
          
          if (functionId == uint(FunctionNames.addPriceTierItem)) {
            uint k = 0;
            
            inputs[k++] = newNullifiers[0];
            inputs[k++] = _inputs.commitmentRoot;
            inputs[k++] = newCommitments[0];
            inputs[k++] = 1;
            
          }

          if (functionId == uint(FunctionNames.checkPO)) {
            uint k = 0;

            for (uint i; i < checkNullifiers.length; i++) {
              inputs[k++] = checkNullifiers[i];
            }
            inputs[k++] = _inputs.commitmentRoot;
            inputs[k++] = newNullifiers[0];
            inputs[k++] = newCommitments[0]; 
            inputs[k++] = 1;
            
          }

          if (functionId == uint(FunctionNames.checkInvoice)) {
            uint k = 0;
             for (uint i; i < newNullifiers.length; i++) {
              inputs[k++] = newNullifiers[i];
            }
            
            inputs[k++] = _inputs.commitmentRoot;

           for (uint i; i < newCommitments.length; i++) {
              inputs[k++] = newCommitments[i];
            }
            for (uint i = _inputs.newCommitments.length; i < 9; i++) {
              // here, we fill any unused commitment slots with 0 for the circuit
              inputs[k++] = 0;
            }
            inputs[k++] = checkNullifiers[0];
            inputs[k++] = 1;
            
          }
          
          bool result = verifier.verify(proof, inputs, vks[functionId]);

          require(result, "The proof has not been verified by the contract");

          if (newCommitments.length > 0) {
      			latestRoot = insertLeaves(newCommitments);
      			commitmentRoots[latestRoot] = latestRoot;
      		}
        }



        address public contractManagerOwner;

struct Invoice {
        
        uint256 sku;

        uint256 quantity;

        uint256 subTotal;
      }

struct PriceTierItem {
        
        uint256 minQuantity;

        uint256 price;
      }

struct Buyer {
        
        address buyer;
      }






        mapping(address => address) private buyers;


        address public seller;

struct PurchaseOrder {
        
        uint256 sku;

        uint256 quantity;

        uint256 subTotal;
      }




      constructor  (address verifierAddress, uint256[][] memory vk)   {

         verifier = IVerifier(verifierAddress);
    		  for (uint i = 0; i < vk.length; i++) {
    			  vks[i] = vk[i];
    		  }
         
        contractManagerOwner = msg.sender;
      }


      function addPriceTierItem (Inputs calldata inputs, uint256[] calldata proof, BackupDataElement[] memory BackupData) public  {

       require(contractManagerOwner == msg.sender, "Caller is unauthorised, only owner can call this");
 verify(proof, uint(FunctionNames.addPriceTierItem), inputs);

            // this seems silly (it is) but its the only way to get the event to emit properly
            emit EncryptedBackupData(BackupData);
            

        
      }


      function addSeller (address _seller) public  {

         require(contractManagerOwner == msg.sender, "Caller is unauthorised, only owner can call this");
seller = _seller;
        
      }

       function addBuyers(address[] calldata _buyers) public {
       require(contractManagerOwner == msg.sender, "Caller is unauthorised, only owner can call this");
            for (uint256 index = 0; index < _buyers.length; index++) {
               buyers[_buyers[index]] = _buyers[index];
            }
        }


      function checkPO (Inputs calldata inputs, uint256[] calldata proof, BackupDataElement[] memory BackupData) public  {

        require(buyers[msg.sender] == msg.sender, "Caller is unauthorised, it must be a buyer");
 verify(proof, uint(FunctionNames.checkPO), inputs);

            // this seems silly (it is) but its the only way to get the event to emit properly
            emit EncryptedBackupData(BackupData);
            
        
      }


      function checkInvoice (Inputs calldata inputs, uint256[] calldata proof, BackupDataElement[] memory BackupData) public  {

        require(msg.sender == seller, "Caller is unauthorised, it must be a seller");
 verify(proof, uint(FunctionNames.checkInvoice), inputs);

            // this seems silly (it is) but its the only way to get the event to emit properly
            emit EncryptedBackupData(BackupData);
            
        
      }
}