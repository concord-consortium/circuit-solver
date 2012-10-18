/*global window Complex */

(function(){

	var CiSo = function() {
		this.components = [];
		this.dcVoltageSources = [];
		this.acVoltageSources = [];
		this.wires = [];
		this.circuitNodeLabels = [];
		this.circuitNodes = [];
		this.gMatrix = [];
	};

	CiSo.prototype.getLinkedComponents = function (node) {
		var links = [],
				i;
		for (i = this.components.length - 1; i >= 0; i--) {
				if((node.label === this.components[i].nodeLabels[0]) || (node.label === this.components[i].nodeLabels[1])) {
					links.push(this.components[i]);
				}
		}
		return links;
	};

	CiSo.prototype.getDiagonalMatrixElement = function(node, freq) {
		var neighborComponents = this.getLinkedComponents(node),
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
		indexes[0] = this.circuitNodeLabels.indexOf(component.nodeLabels[0]);
		indexes[1] = this.circuitNodeLabels.indexOf(component.nodeLabels[1]);
		return indexes;
	};

	var Node = function(label) {
		this.label = label;
	};

	var Component = function(label, type, value, nodeLabels) {
		this.label = label;
		this.type = type;
		this.value = value;
		this.nodeLabels = nodeLabels;
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
		return this.getImpedance(freq).inverse();
	};

	var DCVoltageSource = function (label,voltage,pos_node,neg_node){
		this.label = label;
		this.voltage = voltage;
		this.pos_node = pos_node;
		this.neg_node = neg_node;
	};

	var ACVoltageSource = function (label,voltage,groundNodeLabel,voltageNodeLabel,frequency){
		this.voltage = voltage;
		this.groundNodeLabel = groundNodeLabel;
		this.voltageNodeLabel = voltageNodeLabel;
		this.frequency = frequency;
	};

	CiSo.prototype.addComponent = function (label,type,value,nodeLabels) {
		var component = new Component(label,type,value,nodeLabels); // Make a new component with the right properties
		this.components.push(component); // Push the new component onto the components array.
	};

	CiSo.prototype.addDCVoltageSource = function (label,voltage,positiveNodeLabel,negativeNodeLabel) {
		var source = new DCVoltageSource(label,voltage,positiveNodeLabel,negativeNodeLabel);
		this.dcVoltageSources.push(source);
	};

	CiSo.prototype.addACVoltageSource = function (label,voltage,groundNodeLabel,voltageNodeLabel,frequency) {
		var source = new ACVoltageSource(label,voltage,groundNodeLabel,voltageNodeLabel,frequency);
		this.acVoltageSources.push(source);
	};

	CiSo.prototype.makeNodeList = function () { // Query each component for its nodes, add them to the list if they're not already on it
	// Nodes with the same label are considered to be the same node, so we have to look at the labels to determine uniqueness.
	var components = this.components,
			tempNodeLabelArray, tempNodeLabel1, tempNodeLabel2,
			tempNode1, tempNode2,
			i;
		for (i = 0; i < components.length; i++) {
			tempNodeLabelArray = components[i].nodeLabels; // array of the labels of both nodes owned by the component
			tempNodeLabel1 = tempNodeLabelArray[0];
			tempNodeLabel2 = tempNodeLabelArray[1];
			if (this.circuitNodeLabels.indexOf(tempNodeLabel1) === -1) { // if the label is not already on the list
				this.circuitNodeLabels.push(tempNodeLabel1); // push it onto the label list
				tempNode1 = new Node(tempNodeLabel1); // make a node with that label
				this.circuitNodes.push(tempNode1); // and push it onto the node list
			}
			if (this.circuitNodeLabels.indexOf(tempNodeLabel2) === -1)  {
				this.circuitNodeLabels.push(tempNodeLabel2);
				tempNode2 = new Node(tempNodeLabel2);
				this.circuitNodes.push(tempNode2);
			}
		}
	};

	CiSo.prototype.fillGMatrix = function (){
		var source, frequency,
				cZero,
				i, j,
				rowIndex, colIndex;
		if (this.acVoltageSources.length > 0){
			source = this.acVoltageSources[0];
			frequency = source.frequency;
		}
		cZero = new Complex(0,0);
		for (i = 0; i < this.circuitNodes.length + 1; i++) {
			this.gMatrix [i] = new Array(this.circuitNodes.length + 1);
		}
		for (i = 0; i < this.circuitNodes.length + 1; i++) {
			for (j = 0; j < this.circuitNodes.length + 1; j++) {
				this.gMatrix[i][j] = cZero;
			}
		}
		for (i = 0; i < this.circuitNodes.length; i++){
			this.gMatrix[i][i] = this.getDiagonalMatrixElement(this.circuitNodes[i], frequency);
		}
		for (i = 0; i < this.components.length; i++) {
			rowIndex = this.getNodeIndexes(this.components[i])[0];
			colIndex = this.getNodeIndexes(this.components[i])[1];
			this.gMatrix[rowIndex][colIndex] = this.components[i].getOffDiagonalMatrixElement(frequency);
		}
	};

	CiSo.prototype.augmentGMatrix = function (){
		if (this.acVoltageSources.length === 0) return;

		var one = new Complex(1,0),
				source = this.acVoltageSources[0],
				frequency = source.frequency,
				voltageNodeLabel = source.voltageNodeLabel,
				groundNodeLabel = source.groundNodeLabel,
				voltageNodeIndex = this.circuitNodeLabels.indexOf(voltageNodeLabel),
				groundNodeIndex = this.circuitNodeLabels.indexOf(groundNodeLabel);

		this.gMatrix[this.circuitNodes.length][voltageNodeIndex] = one;
		this.gMatrix[voltageNodeIndex][this.circuitNodes.length] = one;
	};

	window.CiSo = CiSo;
})();