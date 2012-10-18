
CiSo = {};

(function(){

	CiSo = function() {
		this.components = new Array;
		this.dcVoltageSources = new Array;
		this.acVoltageSources = new Array;
		this.wires = new Array;
		this.circuitNodeLabels = new Array;
		this.circuitNodes = [];
		this.gMatrix = [];
	}

	CiSo.prototype.getLinkedComponents = function (node) {
		var links = [];
		for (var i = this.components.length - 1; i >= 0; i--) {
			 if((node.label === this.components[i].nodeLabels[0]) || (node.label === this.components[i].nodeLabels[1])) {
			 	links.push(this.components[i]);
			 }
		}
		return links;
	}

	CiSo.prototype.getDiagonalMatrixElement = function(node, freq) {
		var neighborComponents = this.getLinkedComponents(node);
		var matrixElement = new Complex(0,0);
		for (var i = neighborComponents.length - 1; i >= 0; i--) {
		    var imp = neighborComponents[i].getImpedance(freq);
			matrixElement = matrixElement.add(imp.inverse());
		};
		return matrixElement;
	}

	CiSo.prototype.getNodeIndexes = function(component) {
		var indexes = new Array(2);
		indexes[0] = this.circuitNodeLabels.indexOf(component.nodeLabels[0]);
		indexes[1] = this.circuitNodeLabels.indexOf(component.nodeLabels[1]);
		return indexes;
	}

	Node = function(label) {
		this.label = label;
	}

	Component = function(label, type, value, nodeLabels) {
		this.label = label;
		this.type = type;
		this.value = value;
		this.nodeLabels = nodeLabels;
	}

	twoPi = 2*Math.PI;

	Component.prototype.getImpedance = function(frequency) {
	    var impedance = new Complex (0,0)
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
	}

	Component.prototype.getOffDiagonalMatrixElement = function(freq) {
		return this.getImpedance(freq).inverse();
	}

	DCVoltageSource = function (label,voltage,pos_node,neg_node){
		this.label = label
		this.voltage = voltage;
		this.pos_node = pos_node;
		this.neg_node = neg_node;
	}

	ACVoltageSource = function (label,voltage,groundNodeLabel,voltageNodeLabel,frequency){
		this.voltage = voltage;
		this.groundNodeLabel = groundNodeLabel;
		this.voltageNodeLabel = voltageNodeLabel;
		this.frequency = frequency;
	}

	CiSo.prototype.addComponent = function (label,type,value,nodeLabels) {
	  var component = new Component(label,type,value,nodeLabels); // Make a new component with the right properties
	  this.components.push(component); // Push the new component onto the components array.
	}

	CiSo.prototype.addDCVoltageSource = function (label,voltage,positiveNodeLabel,negativeNodeLabel) {
	  var source = new DCVoltageSource(label,voltage,positiveNodeLabel,negativeNodeLabel);
	  this.dcVoltageSources.push(source);
	}

	CiSo.prototype.addACVoltageSource = function (label,voltage,groundNodeLabel,voltageNodeLabel,frequency) {
	  var source = new ACVoltageSource(label,voltage,groundNodeLabel,voltageNodeLabel,frequency);
	  this.acVoltageSources.push(source);
	}

	CiSo.prototype.makeNodeList = function () { // Query each component for its nodes, add them to the list if they're not already on it
	// Nodes with the same label are considered to be the same node, so we have to look at the labels to determine uniqueness.
	var components = this.components;
		for (var i = 0; i < components.length; i++) {
			var tempNodeLabelArray = components[i].nodeLabels; // array of the labels of both nodes owned by the component
			var tempNodeLabel1 = tempNodeLabelArray[0];
			var tempNodeLabel2 = tempNodeLabelArray[1];
			if (this.circuitNodeLabels.indexOf(tempNodeLabel1) === -1) { // if the label is not already on the list
				this.circuitNodeLabels.push(tempNodeLabel1); // push it onto the label list
			    var tempNode1 = new Node(tempNodeLabel1); // make a node with that label
			    this.circuitNodes.push(tempNode1); // and push it onto the node list
			}
			if (this.circuitNodeLabels.indexOf(tempNodeLabel2) === -1)  {
				this.circuitNodeLabels.push(tempNodeLabel2);
			    var tempNode2 = new Node(tempNodeLabel2);
				this.circuitNodes.push(tempNode2);
			}
		}
	}

	CiSo.prototype.fillGMatrix = function (){
		if (this.acVoltageSources.length > 0){
			var source = this.acVoltageSources[0];
			var frequency = source.frequency;
		}
		var cZero = new Complex (0,0);
		for (var i = 0; i < this.circuitNodes.length + 1; i++) {
			this.gMatrix [i] = new Array (this.circuitNodes.length + 1);
		}
		for (var i = 0; i < this.circuitNodes.length + 1; i++) {
			for (var j = 0; j < this.circuitNodes.length + 1; j++) {
				this.gMatrix[i][j] = cZero;
			}
		}
		for (var i = 0; i < this.circuitNodes.length; i++){
			this.gMatrix[i][i] = this.getDiagonalMatrixElement(this.circuitNodes[i], frequency);
		}
		for (var i = 0; i < this.components.length; i++) {
		 var rowIndex = this.getNodeIndexes(this.components[i])[0];
		 var colIndex = this.getNodeIndexes(this.components[i])[1];
		 this.gMatrix[rowIndex][colIndex] = this.components[i].getOffDiagonalMatrixElement(frequency);
		}
	}

	CiSo.prototype.augmentGMatrix = function (){
		if (this.acVoltageSources.length > 0){
			var one = new Complex (1,0);
			var source = this.acVoltageSources[0];
			var frequency = source.frequency;
			var voltageNodeLabel = source.voltageNodeLabel;
			var groundNodeLabel = source.groundNodeLabel;
			var voltageNodeIndex = this.circuitNodeLabels.indexOf(voltageNodeLabel);
			var groundNodeIndex = this.circuitNodeLabels.indexOf(groundNodeLabel);
			this.gMatrix[this.circuitNodes.length][voltageNodeIndex] = one;
			this.gMatrix[voltageNodeIndex][this.circuitNodes.length] = one;
		}
	}
})();


/*


//  Complex Arithmetic

function Complex(real, imag) {
	this.real = real;
	this.imag = imag;
};

Complex.prototype.copy = function() {
	return new Complex (this.real, this.imag);
};

Complex.prototype.add = function(operand) {
	var real, imag;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}
	this.real += real;
	this.imag += imag;

	return this;
};

Complex.prototype.add = function(operand) {
	var real, imag;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}
	this.real += real;
	this.imag += imag;

	return this;
};

Complex.prototype.subtract = function(operand) { // subtract operand from caller
	var real, imag;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}
	this.real -= real;
	this.imag -= imag;

	return this;
};

Complex.prototype.multiply = function(operand1,operand2) {
	var real, imag, tmp;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}

	tmp = this.real * real - this.imag * imag;
	this.imag = this.real * imag + this.imag * real;
	this.real = tmp;

	return this;
};

Complex.prototype.divide = function(operand) {
	var real, imag, denom, tmp;
	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}

	denom = real * real + imag * imag;
	tmp = (this.real * real + this.imag * imag) / denom;
	this.imag = (this.imag * real - this.real * imag) / denom;
	this.real = tmp;

	return this;
};


*/