import {
	service_allCommitments,
	service_getCommitmentsByState,
	service_reinstateNullifiers,
	service_getSharedKeys,
	service_getBalance,
	service_getBalanceByState,
	service_backupData,
	service_backupVariable,
} from "./api_services.mjs";

import express from "express";

export class Router {
	constructor(serviceMgr) {
		this.serviceMgr = serviceMgr;
	}
	addRoutes() {
		const router = express.Router();

		router.post(
			"/addPriceTierItem",
			this.serviceMgr.service_addPriceTierItem.bind(this.serviceMgr)
		);

		router.post(
			"/addSeller",
			this.serviceMgr.service_addSeller.bind(this.serviceMgr)
		);

		router.post(
			"/addBuyers",
			this.serviceMgr.service_addBuyers.bind(this.serviceMgr)
		);


		router.post(
			"/checkPO",
			this.serviceMgr.service_checkPO.bind(this.serviceMgr)
		);

		router.post(
			"/checkInvoice",
			this.serviceMgr.service_checkInvoice.bind(this.serviceMgr)
		);

		// commitment getter routes
		router.get("/getAllCommitments", service_allCommitments);
		router.get("/getCommitmentsByVariableName", service_getCommitmentsByState);
		router.get("/getBalance", service_getBalance);
		router.get("/getBalanceByState", service_getBalanceByState);
		// nullifier route
		router.post("/reinstateNullifiers", service_reinstateNullifiers);
		router.post("/getSharedKeys", service_getSharedKeys);
		// backup route
		router.post("/backupDataRetriever", service_backupData);
		router.post("/backupVariable", service_backupVariable);

		return router;
	}
}
