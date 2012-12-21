/*global window Complex */

(function(){

	var CiSo = function() {
		this.components = [];
		this.nodeMap = {};				// a map of nodes: {"n1": [comp1, comp2], "n2": [comp2, comp3] ...}
		this.nodes = [];					// an array of all nodes
		this.voltageSources = [];
		this.wires = [];
		this.AMatrix = [];
		this.referenceNode = null;
		this.referenceNodeIndex = null;
	};

	CiSo.prototype.getLinkedComponents = function (node) {
		return this.nodeMap[node];
	};

	CiSo.prototype.getDiagonalMatrixElement = function(node, freq) {
		var neighborComponents = this.nodeMap[node],
				matrixElement = new Complex(0,0),
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
		if (index > this.referenceNodeIndex)
			return index - 1;
		return index;
	};

	var Component = function(label, type, value, nodes) {
		this.label = label;
		this.type = type;
		this.value = value;
		this.nodes = nodes;
	};

	var twoPi = 2*Math.PI;

	Component.prototype.getImpedance = function(frequency) {
		var impedance = new Complex(0,0);
		if (this.type === "Resistor") {
			impedance.real = this.value;
			impedance.imag = 0;
		}
		else if (this.type == "Capacitor") {
			impedance.real = 0;
			impedance.imag = 1/(twoPi * frequency * this.value);
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

	var VoltageSource = function (label,voltage,positiveNode,negativeNode,frequency){
		this.label = label;
		this.voltage = voltage;
		this.positiveNode = positiveNode;
		this.negativeNode = negativeNode;
		this.frequency = frequency || 0;
	};

	CiSo.prototype.addComponent = function (label,type,value,nodeLabels) {
		var component = new Component(label,type,value,nodeLabels), // Make a new component with the right properties
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

	CiSo.prototype.addVoltageSource = function (label,voltage,positiveNode,negativeNode,frequency) {
		var source = new VoltageSource(label,voltage,positiveNode,negativeNode,frequency);
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
		var cZero = new Complex(0,0),
				numNodes = this.nodes.length,
				numSources = this.voltageSources.length,
				arraySize = numNodes - 1 + numSources,
				i, j;

		for (i = 0; i < arraySize; i++) {
			this.AMatrix [i] = [];
			for (j = 0; j < arraySize; j++) {
				this.AMatrix[i][j] = cZero;
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
			if (rowIndex === this.referenceNodeIndex || colIndex === this.referenceNodeIndex) continue;
			this.AMatrix[rowIndex][colIndex] = this.AMatrix[colIndex][rowIndex] = this.components[i].getOffDiagonalMatrixElement(frequency);
		}
	};

	CiSo.prototype.addBCMatrix = function (){
		if (this.voltageSources.length === 0) return;

		var one = new Complex(1,0),
				neg = one.negative(),
				sources = this.voltageSources,
				source, posNode, negNode, nodeIndex, i;

		for (i = 0; i < sources.length; i++) {
			source = sources[i];
			posNode = source.positiveNode;
			if (posNode !== this.referenceNode) {
				nodeIndex = this.getNodeIndex(posNode);
				this.AMatrix[this.nodes.length - 1 + i][nodeIndex] = one;
				this.AMatrix[nodeIndex][this.nodes.length - 1 + i] = one;
			}
			negNode = source.negativeNode;
			if (negNode !== this.referenceNode) {
				nodeIndex = this.getNodeIndex(negNode);
				this.AMatrix[this.nodes.length - 1 + i][nodeIndex] = neg;
				this.AMatrix[nodeIndex][this.nodes.length - 1 + i] = neg;
			}
		}
	};

	window.CiSo = CiSo;
})();