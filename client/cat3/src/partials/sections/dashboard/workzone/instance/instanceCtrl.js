/* Copyright (C) Relevance Lab Private Limited- All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Relevance UI Team,
 * Aug 2015
 */

(function(angular) {
	"use strict";
	angular.module('workzone.instance', ['ngAnimate', 'ui.bootstrap', 'utility.validation', 'filter.currentTime', 'apis.workzone','utility.array','workzonePermission', 'instanceServices', 'chefDataFormatter'])
	.controller('instanceCtrl', ['chefSelectorComponent', '$scope', '$rootScope', '$modal', '$q', 'workzoneServices','arrayUtil', 'instancePermission', 
		'instanceActions', 'instanceOperations', 'workzoneEnvironment', '$timeout', 'workzoneUIUtils', function(chefSelectorComponent, $scope, $rootScope, $modal, $q, workzoneServices,arrayUtil, instancePerms, instanceActions, instanceOperations,workzoneEnvironment, $timeout, workzoneUIUtils) {
			console.log('instanceCtrl');
		var helper = {
			attachListOfTaskWithInstance: function(completeData) {
				var instanceList = completeData.instances;
				$scope.selectedCard = instanceList.length ? instanceList[0]._id : null;
				var taskList = completeData.tasks;
				var inst;
				for (var i = 0; i < instanceList.length; i++) {
					inst = instanceList[i];
					inst.taskDetails = [];
					if (inst.taskIds && inst.taskIds.length) {
						for (var x = 0; x < inst.taskIds.length; x++) {
							for (var j = 0; j < taskList.length; j++) {
								if (inst.taskIds[x] === taskList[j]._id) {
									inst.taskDetails.push({
										name: taskList[j].name,
										id: taskList[j]._id
									});
									break;
								}
							}
						}
					}
				}
				return completeData;
			}
		};
		var completeData;
		$scope.instancePageLevelLoader = true;
		$scope.instStartStopFlag = false;

		/*User permission set example*/
		//defining an object for permission.
		var _permSet = {
			chefClientRun : instancePerms.checkChef(),
			puppet : instancePerms.checkPuppet(),
			logInfo : instancePerms.logInfo(),
			ssh : instancePerms.ssh(),
			rdp : instancePerms.rdp(),
			start : instancePerms.instanceStart(),
			stop : instancePerms.instanceStop(),
			launch : instancePerms.launch()
		};
		$scope.perms = _permSet;

		/*Setting the paginationParams*/
		$scope.isInstancePageLoading = true;
		var gridBottomSpace = 60;
		$scope.paginationParams={
			pages:{
				page:1,
				pageSize:100
			},
			sort:{
				field:'name',
				direction:'desc'
			}
		};
		$scope.currentCardPage = $scope.paginationParams.pages.page;
	   	$scope.cardsPerPage = $scope.paginationParams.pages.pageSize;
	   	$scope.numofCardPages = 0;//Have to calculate from totalItems/cardsPerPage
	   	$scope.totalCards = 0;

		$scope.tabData = [];
		$scope.instancesGridOptions = {
			paginationPageSizes: [10, 25, 50, 100],
			paginationPageSize: $scope.paginationParams.pages.pageSize,
			paginationCurrentPage: $scope.paginationParams.pages.page,
			enableColumnMenus: false,
			enableScrollbars: true,
			enableHorizontalScrollbar: 0,
			enableVerticalScrollbar: 1,
			useExternalPagination: true,
			useExternalSorting: true
		};
		/*grid method to define the columns that need to be present*/
		$scope.initGrids = function(){
			
			$scope.instancesGridOptions.data='tabData';
			$scope.instancesGridOptions.columnDefs = [
				{ name:'Logo', enableSorting: false ,  cellTemplate:'<img src="/cat3/images/global/chef-import.png" ng-show="row.entity.chef"/>'+
				'<img src="/cat3/images/global/chef-import.png" ng-show="row.entity.puppet"/>', cellTooltip: true},
				{ name:'Name', field: 'name', cellTemplate:'<span>{{row.entity.name}}</span>'+
				'<span class="marginleft5" ng-click="grid.appScope.operationSet.editInstanceName(row.entity);">'+
				'<i title="Edit Instance Name" class="fa fa-pencil edit-instance-name cursor"></i>'+
				'</span>', cellTooltip: true},
				{ name:'Ip Address', field:'instanceIP',cellTooltip: true},
				{ name:'RunLists', enableSorting: false , cellTemplate:'<span class="blue cursor" ng-click="grid.appScope.operationSet.viewRunList(row.entity)">View All RunList</span>', cellTooltip: true},
				{ name:'Status', enableSorting: false , cellTemplate:'<div class="status-state {{grid.appScope.getAWSStatus(row.entity.instanceState,1)}}"></div>', cellTooltip: true},
				{ name:'Log Info', enableSorting: false , cellTemplate:'<i class="fa fa-info-circle cursor" title="More Info" ng-click="grid.appScope.operationSet.viewLogs(row.entity)" ng-show="grid.appScope.perms.logInfo"></i>', cellTooltip: true},
				{ name:'Chef Run', enableSorting: false ,  cellTemplate:'<div ng-show="grid.appScope.actionSet.isChefEnabled(row.entity) && grid.appScope.perms.chefClientRun" title="Chef Client Run" class="btn-icons icon-chef" ng-click="grid.appScope.operationSet.updateCookbook(row.entity);"></div>'+
				'<div ng-show="grid.appScope.actionSet.isChefDisabled(row.entity) && grid.appScope.perms.chefClientRun" class="btn-icons icon-chef-disabled"></div>'+
				'<div ng-show="grid.appScope.actionSet.isPuppetEnabled(row.entity) && grid.appScope.perms.puppet" title="Puppet Client Run" class="btn-icons icon-puppet" ng-click="grid.appScope.operationSet.puppetRunClient(row.entity);"></div>'+
				'<div ng-show="grid.appScope.actionSet.isPuppetDisabled(row.entity) && grid.appScope.perms.puppet"class="btn-icons icon-puppet-disabled">'+
				'</div>', cellTooltip: true},
				{ name:'Action', enableSorting: false , cellTemplate:'src/partials/sections/dashboard/workzone/instance/popups/instanceActionGridTemplate.html'}	
			];
		};
		/*APIs registered are triggered as ui-grid is configured 
		for server side(external) pagination.*/
		$scope.instancesGridOptions.onRegisterApi= function(gridApi) {
			$scope.gridApi = gridApi;

			  //Sorting for sortBy and sortOrder
		      gridApi.core.on.sortChanged($scope, function(grid, sortColumns) {
		      	if(sortColumns.length){
			      	$scope.paginationParams.sort={
			      		field:sortColumns[0].field,
			      		direction: sortColumns[0].sort.direction
			      	};
			      	$scope.instancesListCardView();
			    }
		      });

		      //Pagination for page and pageSize
		      gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
		      	$scope.paginationParams.pages={
		      		page:newPage,
		      		pageSize:pageSize
	      		};
	      		$scope.currentCardPage = newPage;
	      		$scope.cardsPerPage = pageSize;
	      		
	      		$scope.instancesListCardView();
		      });
		};
		$scope.cardPaginationChange = function() {
	   		$scope.paginationParams.pages={
	      		page:$scope.currentCardPage,
	      		pageSize:$scope.cardsPerPage
      		};
      		$scope.instancesGridOptions.paginationCurrentPage = $scope.currentCardPage;
	   	};
		//variables used in rendering of the cards and table && checking ssh
		angular.extend($scope, {
			instancesListCardView: function() {
				$scope.isInstancePageLoading = true;
				$scope.instanceList = [];
				// service to get the list of instances.
				workzoneServices.getPaginatedInstances($scope.envParams, $scope.paginationParams).then(function(result) {
					$timeout(function() {
						$scope.instancesGridOptions.totalItems = $scope.totalCards = result.data.metaData.totalRecords;
						$scope.tabData = $scope.instanceList = result.data.instances;
						$scope.isInstancePageLoading = false;
						$scope.numofCardPages = Math.ceil($scope.instancesGridOptions.totalItems / $scope.paginationParams.pages.pageSize);
					}, 100);
				}, function(error) {
					$scope.isInstancePageLoading = false;
					console.log(error);
					$scope.errorMessage = "No Records found";
				});
			},
			/*method to get the AWS instance status(specific only to AWS currently)*/
			getAWSStatus: function(instanceStatus,type) {
				var colorSuffix = '';
				var instanceStateImagePrefix='instance-state-';
				var instanceStateTextPrefix='instance-state-text-';
				 switch(instanceStatus) {
					case 'running': 
						colorSuffix = 'running';
						break;
					case 'stopping': 
						colorSuffix = 'stopping';
						break;
					case 'terminated':
					case 'stopped': 
						colorSuffix = 'stopped';
						break;
					case 'pending': 
						colorSuffix = 'pending';
						break;
					case 'unknown': 
						colorSuffix = 'unknown';
						break;
					case 'paused': 
						colorSuffix = 'paused';
						break;
					default: 
						colorSuffix = 'unknown';
						break;
				}
				if (type === "text") {
					return instanceStateTextPrefix + colorSuffix;
				} else {
					return instanceStateImagePrefix + colorSuffix;
				}
			}, 
			actionSet: instanceActions
		});

		/*	START: Methods which make use of instanceService
			Below methods on the instance card/table make use of instanceActions service.
			Same sevice is reused in control panel actions tab but promise handlers may be different.
		*/
		$scope.operationSet = {};
		$scope.operationSet.deleteInstance = function(inst){
			var promise = instanceOperations.deleteInstance(inst);
			promise.then(function(resolveMessage) {
				console.log("Promise resolved deleteInstance:" + resolveMessage);
				$scope.instancesListCardView();
			}, function(rejectMessage) {
				console.log("Promise rejected deleteInstance:" + rejectMessage);
			});
		};
		$scope.operationSet.editInstanceName = function(inst){
			var promise = instanceOperations.editInstanceName(inst);
			promise.then(function(resolveMessage) {
				console.log("Promise resolved editInstanceName:" + resolveMessage);
				$scope.selected = inst;
			}, function(rejectMessage) {
				console.log("Promise rejected editInstanceName:" + rejectMessage);
			});
		};
		$scope.operationSet.instanceSSH = function(inst){
			var promise = instanceOperations.instanceSSH(inst);
			promise.then(function(resolveMessage) {
				console.log("Promise resolved instanceSSH:" + resolveMessage);
				$scope.selected = inst;
			}, function(rejectMessage) {
				console.log("Promise rejected instanceSSH:" + rejectMessage);
			});
		};
		$scope.operationSet.viewLogs = function(inst){
			var promise = instanceOperations.viewLogs(inst);
			promise.then(function(resolveMessage) {
				console.log("Promise resolved viewLogs:" + resolveMessage);
				$scope.selected = inst;
			}, function(rejectMessage) {
				console.log("Promise rejected viewLogs:" + rejectMessage);
			});
		};
		$scope.operationSet.viewRunList = function(inst){
			var promise = instanceOperations.viewRunList(inst);
			promise.then(function(resolveMessage) {
				console.log("Promise resolved viewRunList:" + resolveMessage);
			}, function(rejectMessage) {
				console.log("Promise rejected viewRunList:" + rejectMessage);
			});
		};
		$scope.operationSet.updateCookbook = function(inst) {
			var promise = instanceOperations.updateCookbook(inst);
			promise.then(function(resolveMessage) {
				console.log("Promise resolved updateCookbook:" + resolveMessage);
				$scope.selected = inst;
			}, function(rejectMessage) {
				console.log("Promise rejected updateCookbook:" + rejectMessage);
			});
		};
		$scope.operationSet.puppetRunClient = function(inst) {
			var promise = instanceOperations.puppetRunClient(inst);
			promise.then(function(resolveMessage) {
				console.log("Promise resolved puppetRunClient:" + resolveMessage);
				$scope.selected = inst;
			}, function(rejectMessage) {
				console.log("Promise rejected puppetRunClient:" + rejectMessage);
			});
		};
		$scope.operationSet.changeInstanceStatus = function(inst) {
			$scope.instStartStopFlag = true;
			var instObj = {_inst:inst, _id:inst._id, state:inst.instanceState, instIdx:$scope.instanceList.indexOf(inst)};
			workzoneServices.getInstanceData(inst).then(
				function(response){
					if(response.data.instanceState==="running"){						
						var stopPromise = instanceOperations.stopInstanceHandler(inst, $scope.perms.stop);
						stopPromise.then(function(){
							$scope.operationSet.checkInstanceStatus(instObj, 2000);
							$scope.operationSet.viewLogs(inst);
						}, function(rejectMessage){
							$scope.instStartStopFlag = false;
							console.log("Promise rejected " + rejectMessage);
						});
					}else{						
						var startPromise = instanceOperations.startInstanceHandler(inst, $scope.perms.start);
						startPromise.then(function(){
							$scope.operationSet.checkInstanceStatus(instObj, 2000);
							$scope.operationSet.viewLogs(inst);
						}, function(rejectMessage){
							$scope.instStartStopFlag = false;
							console.log("Promise rejected " + rejectMessage);
						});
					}
				}
			);
		};
		$scope.operationSet.checkInstanceStatus = function(instObj, delay){
			var _instObj = instObj;

			$timeout(function(){
				workzoneServices.getInstanceData(instObj._inst).then(
					function(response){
						if(response){
							$scope.instanceList[_instObj.instIdx].instanceState = response.data.instanceState;
							console.log(response.data.instanceState, ' polling');

							if( response.data.instanceState === 'stopped' || response.data.instanceState === 'running' ){
								$scope.instStartStopFlag = false;
								console.log(response.data.instanceState, ' polling complete');
							}else{
								$scope.operationSet.checkInstanceStatus(_instObj, 5000);
							}
						}
					},
					function(){
					}
				);
			}, delay);
		};
		/*END: Methods which make use of instanceService*/

		$rootScope.$on('WZ_ENV_CHANGE_START', function(event, requestParams){
			$scope.instancesGridOptions.paginationCurrentPage = $scope.paginationParams.pages.page = 1;
			$scope.envParams=requestParams;
			$scope.initGrids();
			$scope.instancesListCardView();
			$scope.gridHeight = workzoneUIUtils.makeTabScrollable('instancePage')-gridBottomSpace;
			//workzoneUIUtils.makeTabScrollable('instancePage');//TODO: Ideally this should be on resize event;
		});
		$rootScope.$on('WZ_TAB_VISIT', function(event, tabName) {
			if (tabName === 'Instances') {
				$scope.isInstancePageLoading = true;
				var tableData = $scope.tabData;
				$scope.tabData = [];
				$timeout(function() {
					$scope.tabData = tableData;
					$scope.isInstancePageLoading = false;
				}, 100);
			}
		});

		$scope.instanceImportByIP = function() {
			var whetherConfigListAvailable = workzoneServices.getCheckIfConfigListAvailable();
			var getOSList = workzoneServices.getOSList();

			var getConfigList = workzoneServices.getConfigListForOrg(workzoneEnvironment.getEnvParams().org);

			var allPromise = $q.all([whetherConfigListAvailable, getOSList, getConfigList]);

			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'src/partials/sections/dashboard/workzone/instance/popups/instanceImportByIp.html',
				controller: 'instanceImportByIpCtrl',
				backdrop : 'static',
				keyboard: false,
				resolve: {
					items: function() {
						return allPromise;
					}
				}
			});
			modalInstance.result.then(function(newinstId) {
				$scope.instancesListCardView();
				$scope.operationSet.viewLogs(newinstId);
			}, function() {
				console.log('Modal dismissed at: ' + new Date());
			});
		};

		$scope.showAppLinksPopup = function(inst) {
			inst.showAppLinks = !inst.showAppLinks;
			console.log(inst.showAppLinks);
		};

		$scope.selectCard = function(identi) {
			$scope.selectedCard = identi;
		};

		$scope.instanceCardView = function() {
			$scope.isCardViewActive = true;
			$scope.instanceCardViewSelection = "selectedView";
			$scope.instanceTableViewSelection = "";
		};

		$scope.instanceTableView = function() {
			$scope.isCardViewActive = false;
			$scope.instanceTableViewSelection = "selectedView";
			$scope.instanceCardViewSelection = "";
			//$scope.instancesListCardView();
			var tableData = $scope.tabData;
			$scope.tabData = [];
			$timeout(function(){
				$scope.tabData = tableData;
			}, 500);

		};

		$scope.instanceControlPanel = function(instanceObj) {
			$modal.open({
				animation: true,
				templateUrl: 'src/partials/sections/dashboard/workzone/instance/manage/controlPanel.html',
				controller: 'controlPanelCtrl',
				backdrop : 'static',
				keyboard: false,
				size: 'lg',
				resolve: {
					instance: function() {
						return instanceObj;
					}
				}
			});
		};
		$scope.init = function(){
			$scope.instanceCardView();
		};
		
		$scope.init();
	}]);
})(angular);