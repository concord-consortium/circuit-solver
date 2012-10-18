
var components = new Array;
var dcVoltageSources = new Array;
var acVoltageSources = new Array;
var wires = new Array;
var circuitNodeLabels = new Array;
var circuitNodes = [];
var twoPi = 2*Math.PI;
var gMatrix = [];



Node.prototype.getLinkedComponents = function () {
		var links = [];
		for (var i = components.length - 1; i >= 0; i--) {
			 if((this.label === components[i].nodeLabels[0]) || (this.label === components[i].nodeLabels[1])) {
			 	links.push(components[i]);
			 }
		}
		return links;
	}

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

Component.prototype.getNodeIndexes = function() {
	var myIndexes = new Array(2);
	myIndexes[0] = circuitNodeLabels.indexOf(this.nodeLabels[0]);
	myIndexes[1] = circuitNodeLabels.indexOf(this.nodeLabels[1]);
	return myIndexes;
}

Component.prototype.getOffDiagonalMatrixElement = function(freq) {
	return this.getImpedance(freq).inverse();
}

function Node(label) {
	this.label = label;
	this.index = circuitNodes.indexOf(this);
}

Node.prototype.getDiagonalMatrixElement = function(freq) {
	var neighborComponents = this.getLinkedComponents();
	var matrixElement = new Complex(0,0);
	for (var i = neighborComponents.length - 1; i >= 0; i--) {
	    var imp = neighborComponents[i].getImpedance(freq);
		matrixElement = matrixElement.add(imp.inverse());
	};
	return matrixElement;
}

function Component(label, type, value, nodeLabels) {
	this.label = label;
	this.type = type;
	this.value = value;
	this.nodeLabels = nodeLabels;
}

function DCVoltageSource(label,voltage,pos_node,neg_node){
	this.label = label
	this.voltage = voltage;
	this.pos_node = pos_node;
	this.neg_node = neg_node;
}

function ACVoltageSource(label,voltage,groundNodeLabel,voltageNodeLabel,frequency){
	this.voltage = voltage;
	this.groundNodeLabel = groundNodeLabel;
	this.voltageNodeLabel = voltageNodeLabel;
	this.frequency = frequency;
}

function addComponent(label,type,value,nodeLabels) {
  var component = new Component(label,type,value,nodeLabels); // Make a new component with the right properties
  components.push(component); // Push the new component onto the components array.
}

function addDCVoltageSource(label,voltage,positiveNodeLabel,negativeNodeLabel) {
  var source = new DCVoltageSource(label,voltage,positiveNodeLabel,negativeNodeLabel);
  dcVoltageSources.push(source);
}

function addACVoltageSource(label,voltage,groundNodeLabel,voltageNodeLabel,frequency) {
  var source = new ACVoltageSource(label,voltage,groundNodeLabel,voltageNodeLabel,frequency);
  acVoltageSources.push(source);
}

function makeNodeList() { // Query each component for its nodes, add them to the list if they're not already on it
// Nodes with the same label are considered to be the same node, so we have to look at the labels to determine uniqueness.
	for (var i = 0; i < components.length; i++) {
		var tempNodeLabelArray = components[i].nodeLabels; // array of the labels of both nodes owned by the component
		var tempNodeLabel1 = tempNodeLabelArray[0];
		var tempNodeLabel2 = tempNodeLabelArray[1];
		if (circuitNodeLabels.indexOf(tempNodeLabel1) === -1) { // if the label is not already on the list
			circuitNodeLabels.push(tempNodeLabel1); // push it onto the label list
		    var tempNode1 = new Node(tempNodeLabel1); // make a node with that label
		    circuitNodes.push(tempNode1); // and push it onto the node list
		}
		if (circuitNodeLabels.indexOf(tempNodeLabel2) === -1)  {
			circuitNodeLabels.push(tempNodeLabel2);
		    var tempNode2 = new Node(tempNodeLabel2);
			circuitNodes.push(tempNode2);
		}
	}
}

function fillGMatrix(){
	if (acVoltageSources.length > 0){
		var source = acVoltageSources[0];
		var frequency = source.frequency;
	}
	var cZero = new Complex (0,0);
	for (var i = 0; i < circuitNodes.length + 1; i++) {
		gMatrix [i] = new Array (circuitNodes.length + 1);
	}
	for (var i = 0; i < circuitNodes.length + 1; i++) {
		for (var j = 0; j < circuitNodes.length + 1; j++) {
			gMatrix[i][j] = cZero;
		}
	}
	for (var i = 0; i < circuitNodes.length; i++){
		gMatrix[i][i] = circuitNodes[i].getDiagonalMatrixElement(frequency);
	}
	for (var i = 0; i < components.length; i++) {
	 var rowIndex = components[i].getNodeIndexes()[0];
	 var colIndex = components[i].getNodeIndexes()[1];
	 gMatrix[rowIndex][colIndex] = components[i].getOffDiagonalMatrixElement(frequency);
	}
}

function augmentGMatrix(){
	if (acVoltageSources.length > 0){
		var one = new Complex (1,0);
		var source = acVoltageSources[0];
		var frequency = source.frequency;
		var voltageNodeLabel = source.voltageNodeLabel;
		var groundNodeLabel = source.groundNodeLabel;
		var voltageNodeIndex = circuitNodeLabels.indexOf(voltageNodeLabel);
		var groundNodeIndex = circuitNodeLabels.indexOf(groundNodeLabel);
		gMatrix[circuitNodes.length][voltageNodeIndex] = one;
		gMatrix[voltageNodeIndex][circuitNodes.length] = one;
	}
}


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