// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
contract TieredPricing {

address public immutable contractManagerOwner;

struct Invoice {
uint256 sku;
uint256 quantity;
uint256 subTotal;
}

struct PriceTierItem {
uint256 minQuantity;
uint256 price;
}

struct Buyer{
address buyer;
}

mapping (uint256 => PriceTierItem[9]) private assetPriceTiers;

mapping (uint256 => uint256) private orderedQuantities;

mapping(address => address) private buyers;

address public seller;

struct PurchaseOrder {
uint256 sku;
uint256 quantity;
uint256 subTotal;
}

mapping (uint256 => PurchaseOrder[9]) private purchaseOrder; 

modifier onlyBuyer() {
require(buyers[msg.sender] == msg.sender, "Caller is unauthorised, it must be a buyer");
_;
}

modifier onlySeller() {
require(msg.sender == seller, "Caller is unauthorised, it must be a seller");
_;
}

modifier onlyOwner() {
require(msg.sender == seller, "Caller is unauthorised, it must be a seller");
_;
}

constructor() {
contractManagerOwner = msg.sender;
}

function addPriceTierItem(uint256 sku, PriceTierItem[9] calldata priceTierItem) public onlyOwner {
require(msg.sender == seller, "Caller is unauthorised, it must be a seller");

assetPriceTiers[sku] = priceTierItem;
}

function addSeller(address _seller) public onlyOwner {
require(msg.sender == seller, "Caller is unauthorised, it must be a seller");

seller = _seller;
}

// function addBuyers(address[] calldata _buyers) public onlyOwner {
// for (uint256 index = 0; index < _buyers.length; index++) {
// buyers[_buyers[index]] = _buyers[index];
// }
// }

function checkPO(PurchaseOrder[9] calldata order, uint256 purchaseOrderId) public onlyBuyer { //dest should seller, sender should be buyer
require(buyers[msg.sender] == msg.sender, "Caller is unauthorised, it must be a buyer");

for (uint256 index = 0; index < 9; index++) {
require(order[index].quantity > 0, "Quantity should be greater than zero");
uint256 sku = order[index].sku;
PriceTierItem memory tier = assetPriceTiers[sku][index];
require(tier.price != 0, "Price tier does not exists in the contract");
purchaseOrder[purchaseOrderId][index] = order[index];
}
}

function checkInvoice(Invoice[9] calldata invoice, uint256 purchaseOrderId) public onlySeller { // sender should seller
require(msg.sender == seller, "Caller is unauthorised, it must be a seller");

// PO should be owned by seller
for (uint256 index = 0; index < 9; index++) {
uint256 sku = invoice[index].sku;
PurchaseOrder memory po = purchaseOrder[purchaseOrderId][index];
require(po.quantity != 0 && po.subTotal != 0 , "Either purchase order Id or sku is incorrect");
require(po.quantity == invoice[index].quantity, "Invoice quantity does not match with PO");
require(po.subTotal == invoice[index].subTotal, "Invoice subTotal does not match with PO");
orderedQuantities[sku] += invoice[index].quantity;
}
}

}
