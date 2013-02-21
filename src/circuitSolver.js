/*global window Complex */

(function(){

	var CiSo = function() {
		this.components = [];
		this.nodeMap = {};				// a map of nodes: {"n1": [comp1, comp2], "n2": [comp2, comp3] ...}
		this.nodes = [];					// an array of all nodes
		this.voltageSources = [];
		this.AMatrix = [];
		this.ZMatrix = [];
		this.referenceNode = null;
		this.referenceNodeIndex = null;
	};

	CiSo.prototype.getLinkedComponents = function (node) {
		return this.nodeMap[node];
	};

	CiSo.prototype.getDiagonalMatrixElement = function(node, freq) {
		var neighborComponents = this.nodeMap[node],
				matrixElement = $Comp(0,0),
				imp, i;
		for (i = neighborComponents.length - 1; i >= 0; i--) {
			imp = neighborComponents[i].getImpedance(freq);
			matrixElement = matrixElement.add(imp.inverse());
		}
		return matrixElement;
	};

	CiSo.prototype.getNodeIndexes = function(component) {
		var indexes = [];
		indexes[0] = this.getNodeIndex(component.nodes[0]);
		indexes[1] = this.getNodeIndex(component.nodes[1]);
		return indexes;
	};

	CiSo.prototype.getNodeIndex = function(node) {
		var index = this.nodes.indexOf(node);
		if (index === this.referenceNodeIndex)
			return -1;
		if (index > this.referenceNodeIndex)
			return index - 1;
		return index;
	};

	var Component = function(id, type, value, nodes) {
		this.id = id;
		this.type = type;
		this.value = value;
		this.nodes = nodes;
	};

	var twoPi = 2*Math.PI;

	Component.prototype.getImpedance = function(frequency) {
		var impedance = $Comp(0,0);
		if (this.type === "Resistor") {
			impedance.real = this.value;
			impedance.imag = 0;
		}
		else if (this.type == "Capacitor") {
			impedance.real = 0;
			impedance.imag = -1/(twoPi * frequency * this.value);
		}
		else if (this.type == "Inductor") {
			impedance.real = 0;
			impedance.imag = twoPi * frequency * this.value;
		}
		return impedance;
	};

	Component.prototype.getOffDiagonalMatrixElement = function(freq) {
		return this.getImpedance(freq).inverse().negative();
	};

	var VoltageSource = function (id,voltage,positiveNode,negativeNode,frequency){
		this.id = id;
		this.voltage = voltage;
		this.positiveNode = positiveNode;
		this.negativeNode = negativeNode;
		this.frequency = frequency || 0;
	};

	CiSo.prototype.addComponent = function (id,type,value,nodeLabels) {
		var component = new Component(id,type,value,nodeLabels), // Make a new component with the right properties
				i, ii, node;

		// Push the new component onto the components array
		this.components.push(component);

		// push the component into the nodes hash
		for (i=0, ii=nodeLabels.length; i<ii; i++) {
			node = nodeLabels[i];
			if (!this.nodeMap[node]) {
				this.nodeMap[node] = [];
				this.nodes.push(node);
			}
			this.nodeMap[node].push(component);
		}
	};

	CiSo.prototype.addVoltageSource = function (id,voltage,positiveNode,negativeNode,frequency) {
		var source = new VoltageSource(id,voltage,positiveNode,negativeNode,frequency);
		this.voltageSources.push(source);

		if (!this.nodeMap[positiveNode]) {
			this.nodeMap[positiveNode] = [];
			this.nodes.push(positiveNode);
		}

		if (!this.nodeMap[negativeNode]) {
			this.nodeMap[negativeNode] = [];
			this.nodes.push(negativeNode);
		}

		if (!this.referenceNode) {
			this.setReferenceNode(negativeNode);
		}
	};

	CiSo.prototype.setReferenceNode = function(node) {
		this.referenceNode = node;
		this.referenceNodeIndex = this.nodes.indexOf(node);
	};

	CiSo.prototype.createAMatrix = function () {
		this.createEmptyAMatrix();
		this.addGMatrix();
		this.addBCMatrix();
	};

	CiSo.prototype.createEmptyAMatrix = function () {
		var cZero = $Comp(0,0),
				numNodes = this.nodes.length,
				numSources = this.voltageSources.length,
				arraySize = numNodes - 1 + numSources,
				i, j;

		for (i = 0; i < arraySize; i++) {
			this.AMatrix [i] = [];
			for (j = 0; j < arraySize; j++) {
				this.AMatrix[i][j] = cZero.copy();
			}
		}
	};

	CiSo.prototype.addGMatrix = function (){
		var source, frequency,
				i, j,
				node, index,
				rowIndex, colIndex;
		if (this.voltageSources.length > 0){
			source = this.voltageSources[0];
			frequency = source.frequency;
		}
		for (i = 0; i < this.nodes.length; i++){
			node = this.nodes[i];
			if (node === this.referenceNode) continue;
			index = this.getNodeIndex(node);
			this.AMatrix[index][index] = this.getDiagonalMatrixElement(node, frequency);
		}
		for (i = 0; i < this.components.length; i++) {
			rowIndex = this.getNodeIndexes(this.components[i])[0];
			colIndex = this.getNodeIndexes(this.components[i])[1];
			if (rowIndex === -1 || colIndex === -1) continue;
			this.AMatrix[rowIndex][colIndex] = this.AMatrix[colIndex][rowIndex] = this.AMatrix[rowIndex][colIndex].add(this.components[i].getOffDiagonalMatrixElement(frequency));
		}
	};

	CiSo.prototype.addBCMatrix = function (){
		if (this.voltageSources.length === 0) return;

		var one = $Comp(1,0),
				neg = one.negative(),
				sources = this.voltageSources,
				source, posNode, negNode, nodeIndex, i;

		for (i = 0; i < sources.length; i++) {
			source = sources[i];
			posNode = source.positiveNode;
			if (posNode !== this.referenceNode) {
				nodeIndex = this.getNodeIndex(posNode);
				this.AMatrix[this.nodes.length - 1 + i][nodeIndex] = one.copy();
				this.AMatrix[nodeIndex][this.nodes.length - 1 + i] = one.copy();
			}
			negNode = source.negativeNode;
			if (negNode !== this.referenceNode) {
				nodeIndex = this.getNodeIndex(negNode);
				this.AMatrix[this.nodes.length - 1 + i][nodeIndex] = neg.copy();
				this.AMatrix[nodeIndex][this.nodes.length - 1 + i] = neg.copy();
			}
		}
	};

	CiSo.prototype.createZMatrix = function () {
		var cZero = $Comp(0,0),
				numNodes = this.nodes.length,
				numSources = this.voltageSources.length,
				arraySize = numNodes - 1 + numSources,
				sources = this.voltageSources,
				i;

		this.ZMatrix[0] = []

		for (i=0; i<arraySize; i++) {
			this.ZMatrix[0][i] = cZero.copy()
		}

		for (i = 0; i < sources.length; i++) {
			this.ZMatrix[0][numNodes - 1 + i].real = sources[i].voltage;
		}
	};

	/**
	 * Here we delete any nodes, components and voltage sources that have
	 * no connection to the reference node.
	 */
	CiSo.prototype.cleanCircuit = function () {
		var nodes = this.nodes,
				nodeMap = this.nodeMap,
				components = this.components,
				component,
				referenceNode = this.referenceNode,
				knownConnectedNodes = [],
				source,
				node, i, ii;

		function clone(arr) {
			var cln = []
			for (var i in arr) {
				cln[i] = arr[i];
			}
			return cln;
		}

		nodeMap = clone(nodeMap);

		function squash(arr) {
			var newArr = [];
			for (var i=0, ii=arr.length; i<ii; i++) {
				if (arr[i] !== null) newArr.push(arr[i]);
			}
			return newArr;
		}

		function canReachReferenceNode(node, nodeMap) {
			var connectedComponents = nodeMap[node],
					component, compNodes,
					connectedNodes = [],
					didRemove,
					i, ii, j, jj;

			if (node === referenceNode) return true;

			if (~knownConnectedNodes.indexOf(node)) return true;

			if (!connectedComponents || connectedComponents.length === 0) return false;

			delete nodeMap[node];

			for (i = 0, ii = connectedComponents.length; i < ii; i++) {
				component = connectedComponents[i];
				compNodes = clone(component.nodes);
				compNodes.splice(compNodes.indexOf(node), 1);
				connectedNodes = connectedNodes.concat(compNodes);
			}

			for (j = 0, jj = connectedNodes.length; j < jj; j++) {
				if (canReachReferenceNode(connectedNodes[j], nodeMap)) {
					knownConnectedNodes.push(node);
					return true;
				}
			}

			return false;
		}

		// Remove all nodes that aren't reachable from reference node
		for (i = 0, ii = nodes.length; i<ii; i++) {
			node = nodes[i];
			if (node) {
				if (!canReachReferenceNode(node, nodeMap)) {
					nodes[i] = null;
				}
			}
		}

		this.nodes = squash(nodes);

		// remove all components not attached on two reachable nodes
		nodeMap = this.nodeMap;

		function removeComponentFromNodeMap(component, node) {
			var components = clone(nodeMap[node]),
					i, ii;
			nodeMap[node] = [];
			for (i = 0, ii = components.length; i<ii; i++) {
				if (components[i].id !== component.id) {
					nodeMap[node].push(components[i]);
				}
			}

		}

		for (i = 0, ii=components.length; i<ii; i++) {
			component = components[i];
			if (!(~nodes.indexOf(component.nodes[0]) && ~nodes.indexOf(component.nodes[1]))) {
				removeComponentFromNodeMap(component, component.nodes[0]);
				removeComponentFromNodeMap(component, component.nodes[1]);
				components[i] = null;
			}
		}

		this.components = squash(components);

		// Remove all voltage sources that aren't attached to two reachable nodes
		for (i = 0, ii=this.voltageSources.length; i<ii; i++) {
			source = this.voltageSources[i];
			if (!(~nodes.indexOf(source.positiveNode) && ~nodes.indexOf(source.negativeNode))) {
				this.voltageSources[i] = null;
			}
		}

		this.voltageSources = squash(this.voltageSources);

		// Reset reference node index
		this.referenceNodeIndex = this.nodes.indexOf(referenceNode);
	};

	CiSo.prototype.solve = function () {
		this.cleanCircuit();

		this.createAMatrix();
		this.createZMatrix();

		aM = $M(this.AMatrix);
		zM = $M(this.ZMatrix);
		invAM = aM.inv();
		res = zM.x(invAM);
		return res;
	};

	CiSo.prototype.getVoltageAt = function(node) {
		if (node === this.referenceNode) {
			return $Comp(0);
		}
		var res = this.solve();
		return res.elements[0][this.getNodeIndex(node)];
	};

	CiSo.prototype.getVoltageBetween = function(node1, node2) {
		return this.getVoltageAt(node1).subtract(this.getVoltageAt(node2));
	};

	CiSo.prototype.getCurrent = function(voltageSource) {
		var sources = this.voltageSources,
				res     = this.solve(),
				sourceIndex = null,
				i, ii;

		for (i = 0, ii = sources.length; i < ii; i++) {
			if (sources[i].label == voltageSource) {
				sourceIndex = i;
				break;
			}
		}

		if (sourceIndex === null) {
			throw Error("No voltage source "+voltageSource);
		}

		return res.elements[0][this.nodes.length - 1 - i];
	}

	window.CiSo = CiSo;
})();