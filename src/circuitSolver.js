/*global window Complex */

(function () {

    var CiSo = function () {
        this.components = [];
        this.nodeMap = {};				// a map of nodes: {"n1": [comp1, comp2], "n2": [comp2, comp3] ...}
        this.nodes = [];					// an array of all nodes
        this.voltageSources = [];
        this.AMatrix = [];
        this.ZMatrix = [];
        this.referenceNode = null;
        this.referenceNodeIndex = null;
        this.frequency = $Comp(0);
        this.time = 0;
    };

    CiSo.prototype.getLinkedComponents = function (node) {
        return this.nodeMap[node];
    };

    CiSo.prototype.getDiagonalMatrixElement = function (node, freq) {
        var neighborComponents = this.nodeMap[node],
				matrixElement = $Comp(0, 0),
				imp, i;
        for (i = neighborComponents.length - 1; i >= 0; i--) {
            imp = neighborComponents[i].getImpedance(freq);
            matrixElement = matrixElement.add(imp.inverse());
        }
        return matrixElement;
    };

    CiSo.prototype.getNodeIndexes = function (component) {
        var indexes = [];
        indexes[0] = this.getNodeIndex(component.nodes[0]);
        indexes[1] = this.getNodeIndex(component.nodes[1]);
        return indexes;
    };

    CiSo.prototype.getNodeIndex = function (node) {
        var index = this.nodes.indexOf(node);
        if (index === this.referenceNodeIndex)
            return -1;
        if (index > this.referenceNodeIndex)
            return index - 1;
        return index;
    };

    var Component = function (id, type, value, nodes, dark_current, value_reverse, bias) {
        this.id = id;
        this.type = type;
        this.value = value;
        this.nodes = nodes;
        if (type === "Diode") {
            this.dark_current = dark_current;
            this.bias = true; //The default bias of the diode is forward
            this.value = 1;
            this.value_reverse = -10 / (dark_current * (Math.exp(-40 * 10) - 1));
        }

        if (type === "MOSFET") {
            this.value = 1;
            this.value_reverse = 1000000;
        }
    };

    var twoPi = 2 * Math.PI;
    var res_array_state = [];

    Component.prototype.getImpedance = function (frequency) {
        var impedance = $Comp(0, 0);
        if (this.type === "Resistor") {
            impedance.real = this.value;
            impedance.imag = 0;
        }
        else if (this.type == "Capacitor" || this.type == "Inductor") {
            impedance.real = 0;
            impedance.imag = 0;
        }

        else if (this.type == "Diode") {
            impedance.real = this.value;
            impedance.imag = 0;
        }
        return impedance;
    };

    Component.prototype.getOffDiagonalMatrixElement = function (freq) {
        return this.getImpedance(freq).inverse().negative();
    };

    var VoltageSource = function (id, voltage, positiveNode, negativeNode, frequency, array) {
        this.id = id;
        this.voltage = voltage;
        this.positiveNode = positiveNode;
        this.negativeNode = negativeNode;
        this.frequency = frequency || 0;
        this.array = array;
    };

    CiSo.prototype.addComponent = function (id, type, value, nodeLabels, dark_current, value_reverse, bias) {
        var component = new Component(id, type, value, nodeLabels, dark_current, value_reverse, bias), // Make a new component with the right properties
				i, ii, node;

        if (type === "Capacitor") {

            dark_current = 0;

            var source = new VoltageSource(id, dark_current / value, nodeLabels[0], nodeLabels[1], this.frequency);
            this.voltageSources.push(source);
            var positiveNode = nodeLabels[0];
            var negativeNode = nodeLabels[1];

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
        }

        if (type === "Transistor") { // modelling a BJT as a combination of two diodes
            var nodeLabels_diode_1 = [nodeLabels[1], nodeLabels[0]];
            var nodeLabels_diode_2 = [nodeLabels[1], nodeLabels[2]];

            var component_diode_1 = new Component((id + '1'), "Diode", value, nodeLabels_diode_1, dark_current, value_reverse, bias);
            var component_diode_2 = new Component((id + '2'), "Diode", value, nodeLabels_diode_2, dark_current, value_reverse, bias);
            this.components.push(component_diode_1);
            this.components.push(component_diode_2);

            for (i = 0, ii = nodeLabels_diode_1.length; i < ii; i++) {
                node = nodeLabels_diode_1[i];
                if (!this.nodeMap[node]) {
                    this.nodeMap[node] = [];
                    this.nodes.push(node);
                }
                this.nodeMap[node].push(component_diode_1);
            }

            for (i = 0, ii = nodeLabels_diode_2.length; i < ii; i++) {
                node = nodeLabels_diode_2[i];
                if (!this.nodeMap[node]) {
                    this.nodeMap[node] = [];
                    this.nodes.push(node);
                }
                this.nodeMap[node].push(component_diode_2);
            }
        }

        else {

            if (type === "MOSFET")
                component = new Component(id, "Resistor", value, nodeLabels);

            component = new Component(id, type, value, nodeLabels, dark_current, value_reverse, bias);

            // Push the new component onto the components array
            this.components.push(component);

            // push the component into the nodes hash
            for (i = 0, ii = nodeLabels.length; i < ii; i++) {
                node = nodeLabels[i];
                if (!this.nodeMap[node]) {
                    this.nodeMap[node] = [];
                    this.nodes.push(node);
                }
                this.nodeMap[node].push(component);
            }
        }
    };

    CiSo.prototype.addVoltageSource = function (id, voltage, positiveNode, negativeNode, frequency, array) {
        this.frequency = frequency;
        var source = new VoltageSource(id, voltage, positiveNode, negativeNode, frequency, array);
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

    CiSo.prototype.setReferenceNode = function (node) {
        this.referenceNode = node;
        this.referenceNodeIndex = this.nodes.indexOf(node);
    };

    CiSo.prototype.createAMatrix = function () {
        this.createEmptyAMatrix();
        this.addGMatrix();
        this.addBCMatrix();
    };

    CiSo.prototype.createEmptyAMatrix = function () {
        var cZero = $Comp(0, 0),
				numNodes = this.nodes.length,
				numSources = this.voltageSources.length,
				arraySize = numNodes - 1 + numSources,
				i, j;

        this.AMatrix = [];

        for (i = 0; i < arraySize; i++) {
            this.AMatrix[i] = [];
            for (j = 0; j < arraySize; j++) {
                this.AMatrix[i][j] = cZero.copy();
            }
        }
    };

    CiSo.prototype.addGMatrix = function () {
        var source, frequency,
				i, j,
				node, index,
				rowIndex, colIndex;
        if (this.voltageSources.length > 0) {
            source = this.voltageSources[0];
            frequency = source.frequency;
        }
        for (i = 0; i < this.nodes.length; i++) {
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

    CiSo.prototype.addBCMatrix = function () {
        if (this.voltageSources.length === 0) return;

        var one = $Comp(1, 0),
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

    CiSo.prototype.createZMatrix = function (time) {
        var cZero = $Comp(0, 0),
				numNodes = this.nodes.length,
				numSources = this.voltageSources.length,
				arraySize = numNodes - 1 + numSources,
				sources = this.voltageSources,
				i;

        this.ZMatrix = [[]];

        for (i = 0; i < arraySize; i++) {
            this.ZMatrix[0][i] = cZero.copy()
        }

        if (time >= 0) {
            for (i = 0; i < sources.length; i++) {
                if (sources[i].frequency >= 0)
                    this.ZMatrix[0][numNodes - 1 + i].real = (sources[i].voltage * Math.cos(twoPi * sources[i].frequency * time));
                else
                    if (-1 * time * sources[i].frequency <= sources[i].array.length)
                        this.ZMatrix[0][numNodes - 1 + i].real = (sources[i].array[-1 * Math.ceil(time * sources[i].frequency)]); //negative frequency implies that the input is a step input with each voltage staying constant for a time preiod equal to 1/|frequency|
                    else
                        this.ZMatrix[0][numNodes - 1 + i].real = sources[i].voltage;
            }
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
            for (var i = 0, ii = arr.length; i < ii; i++) {
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
        for (i = 0, ii = nodes.length; i < ii; i++) {
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
            for (i = 0, ii = components.length; i < ii; i++) {
                if (components[i].id !== component.id) {
                    nodeMap[node].push(components[i]);
                }
            }

        }

        for (i = 0, ii = components.length; i < ii; i++) {
            component = components[i];
            if (!(~nodes.indexOf(component.nodes[0]) && ~nodes.indexOf(component.nodes[1])) && component.type != "MOSFET" && component.type != "Transistor") {
                removeComponentFromNodeMap(component, component.nodes[0]);
                removeComponentFromNodeMap(component, component.nodes[1]);
                components[i] = null;
            }

            else if (!(~nodes.indexOf(component.nodes[0]) && ~nodes.indexOf(component.nodes[1]) && ~nodes.indexOf(component.nodes[2])) && (component.type === "Transistor" || component.type === "MOSFET")) {
                removeComponentFromNodeMap(component, component.nodes[0]);
                removeComponentFromNodeMap(component, component.nodes[1]);
                removeComponentFromNodeMap(component, component.nodes[1]);
                components[i] = null;
            }
        }

        this.components = squash(components);

        // Remove all voltage sources that aren't attached to two reachable nodes
        for (i = 0, ii = this.voltageSources.length; i < ii; i++) {
            source = this.voltageSources[i];
            if (!(~nodes.indexOf(source.positiveNode) && ~nodes.indexOf(source.negativeNode))) {
                this.voltageSources[i] = null;
            }
        }

        this.voltageSources = squash(this.voltageSources);

        // Reset reference node index
        this.referenceNodeIndex = this.nodes.indexOf(referenceNode);
    };

    CiSo.prototype.solve = function (time) {


        var impedance_string = "Impedance - ";
        components = this.components;
        sources = this.voltageSources;
        var frequency = Math.max(Math.abs(this.frequency), 1000);
        var res_array = [];
        var time_0 = 0;

        this.cleanCircuit();

        this.createAMatrix();
        this.createZMatrix(time_0);

        aM = $M(this.AMatrix);
        zM = $M(this.ZMatrix);
        invAM = aM.inv();
        var res_previous = zM.x(invAM);

        while (time_0 <= time) {

            this.time = time_0;
            this.cleanCircuit();

            this.createAMatrix();
            this.createZMatrix(time_0);

            aM = $M(this.AMatrix);
            zM = $M(this.ZMatrix);
            invAM = aM.inv();
            res = zM.x(invAM);

            var check = true, check1 = true, i, ii, temp;
            while (check === true) {
                check = false;

                for (i = 0, ii = components.length; i < ii; i++) {
                    var component = components[i];
                    var nodes = component.nodes;
                    var node1 = nodes[0];
                    var node2 = nodes[1];
                    var index1 = this.getNodeIndex(node1);
                    var index2 = this.getNodeIndex(node2);
                    var value = component.value;
                    var value_reverse = component.value_reverse;

                    if (component.type === "Capacitor") {
                        if (time_0 === 0)
                            dark_current = 0; //dark_current for capacitor stores state corresponding to charge => all caps are uncharged at time = 0
                        else {
                            var sources = this.voltageSources;
                            var sourceIndex = null;
                            var current = null;

                            for (i = 0, ii = sources.length; i < ii; i++) {
                                if (sources[i].id == component.id) {
                                    sourceIndex = i;
                                    break;
                                }
                            }

                            current = res_previous.elements[0][this.nodes.length - 1 + sourceIndex];

                            dark_current = dark_current + 0.01 * current.real / frequency;

                            sources[sourceIndex].voltage = dark_current / value;
                        }
                    }


                    if (component.type === "Resistor" && nodes.length === 3) { // Indicates that the resistor is an abstraction of a MOSFET
                        var gate = nodes[1];
                        node2 = nodes[2];
                        index2 = this.getNodeIndex(node2);
                        index_gate = this.getNodeIndex(gate);

                        if (index_gate != -1 && index2 != -1) {
                            if (((res.elements[0][index_gate]).real - (res.elements[0][index2]).real < 0 && (value < value_reverse)) || ((res.elements[0][index_gate]).real - (res.elements[0][index2]).real > 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;

                                check = true;
                            }
                        }

                        else if (index_gate === -1) {
                            if ((res.elements[0][index2].real > 0 && (value < value_reverse)) || (res.elements[0][index2].real < 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;

                                check = true;
                            }
                        }

                        else if (index2 === -1) {
                            if ((res.elements[0][index_gate].real < 0 && (value < value_reverse)) || (res.elements[0][index_gate].real > 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;

                                check = true;
                            }
                        }


                        component.value = value;
                        component.value_reverse = value_reverse;
                        component.dark_current = dark_current;
                        components[i] = component;
                        this.cleanCircuit();
                        this.createAMatrix();
                        this.createZMatrix(time_0);
                        aM = $M(this.AMatrix);
                        zM = $M(this.ZMatrix);
                        invAM = aM.inv();
                        res = zM.x(invAM);
                    }

                    if (component.type === "Diode") {

                        if (index1 != -1 && index2 != -1) {
                            if (((res.elements[0][index1]).real - (res.elements[0][index2]).real < 0 && (value < value_reverse)) || ((res.elements[0][index1]).real - (res.elements[0][index2]).real > 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;
                                component.bias = !(component.bias);

                                check = true;
                            }
                        }

                        else if (index1 === -1) {
                            if ((res.elements[0][index2].real > 0 && (value < value_reverse)) || (res.elements[0][index2].real < 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;
                                component.bias = !(component.bias);

                                check = true;
                            }
                        }

                        else if (index2 === -1) {
                            if ((res.elements[0][index1].real < 0 && (value < value_reverse)) || (res.elements[0][index1].real > 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;
                                component.bias = !(component.bias);

                                check = true;
                            }
                        }


                        component.value = value;
                        component.value_reverse = value_reverse;
                        components[i] = component;
                        this.cleanCircuit();
                        this.createAMatrix();
                        this.createZMatrix(time_0);
                        aM = $M(this.AMatrix);
                        zM = $M(this.ZMatrix);
                        invAM = aM.inv();
                        res = zM.x(invAM);
                    }
                }
            } // when the iteration ends, the diode biases are correctly determined

            while (check1 === true) {
                check1 = false;
                for (i = 0, ii = components.length; i < ii; i++) {
                    var component = components[i];
                    var nodes = component.nodes;
                    var node1 = nodes[0];
                    var node2 = nodes[1];
                    var index1 = this.getNodeIndex(node1);
                    var index2 = this.getNodeIndex(node2);
                    var value_original;


                    if (component.type === "Resistor" && nodes.length === 3) {
                        var gate = nodes[1];
                        node2 = nodes[2];
                        index2 = this.getNodeIndex(node2);
                        index_gate = this.getNodeIndex(gate);

                        if (index_gate != -1 && index2 != -1) {
                            if (((res.elements[0][index_gate]).real - (res.elements[0][index2]).real < 0 && (value < value_reverse)) || ((res.elements[0][index_gate]).real - (res.elements[0][index2]).real > 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;

                                check = true;
                            }
                        }

                        else if (index_gate === -1) {
                            if ((res.elements[0][index2].real > 0 && (value < value_reverse)) || (res.elements[0][index2].real < 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;

                                check = true;
                            }
                        }

                        else if (index2 === -1) {
                            if ((res.elements[0][index_gate].real < 0 && (value < value_reverse)) || ti(res.elements[0][index_gate].real > 0 && (value > value_reverse))) {
                                temp = value_reverse;
                                value_reverse = value;
                                value = temp;

                                check = true;
                            }
                        }


                        component.value = value;
                        component.value_reverse = value_reverse;
                        components[i] = component;
                        this.cleanCircuit();
                        this.createAMatrix();
                        this.createZMatrix(time_0);
                        aM = $M(this.AMatrix);
                        zM = $M(this.ZMatrix);
                        invAM = aM.inv();
                        res = zM.x(invAM);
                    }

                    if (component.type === "Diode" && component.bias === false) {
                        value_original = component.value;
                        if (index1 != -1 && index2 != -1) {
                            if (Math.abs(temp - (component.value * component.dark_current * (Math.exp(((res.elements[0][index1]).real - (res.elements[0][index2]).real) * 40) - 1))) >= 0.00001) {
                                while (component.dark_current * component.value * (Math.exp(40 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)) - 1) >= 1E10)
                                    component.value = component.value / 10;

                                temp = (component.value * component.dark_current * (Math.exp(((res.elements[0][index1]).real - (res.elements[0][index2]).real) * 40) - 1));
                                if ((res.elements[0][index1]).real - (res.elements[0][index2]).real < 0) {
                                    component.value = ((res.elements[0][index1]).real - (res.elements[0][index2]).real) / (component.dark_current * (Math.exp(40 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)) - 1));
                                    component.bias = false;
                                }
                                else {
                                    component.value = 0.025 / component.dark_current;
                                    component.bias = true;
                                }
                                check = true;
                            }
                        }

                        else if (index1 === -1) {
                            if (Math.abs(temp - (component.value * component.dark_current * (Math.exp((-(res.elements[0][index2]).real * 40) - 1))) >= 0.00001)) {
                                while (component.dark_current * component.value * (Math.exp(-res.elements[0][index2] * 40).real - 1) >= 1E10)
                                    component.value = component.value / 10;

                                temp = (component.value * component.dark_current * (Math.exp(-(res.elements[0][index2]).real * 40) - 1));
                                component.value = (-(res.elements[0][index2]).real) / (component.dark_current * (Math.exp(-(res.elements[0][index2] * 40).real) - 1));
                                if (-(res.elements[0][index2]).real > 0) {
                                    component.value = ((res.elements[0][index1]).real - (res.elements[0][index2]).real) / (component.dark_current * (Math.exp(40 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)) - 1));
                                    component.bias = false;
                                }
                                else {
                                    component.value = 0.025 / component.dark_current;
                                    component.bias = true;
                                }

                                check = true;
                            }
                        }

                        else if (index2 === -1) {
                            if (Math.abs(temp - (component.value * component.dark_current * (Math.exp(((res.elements[0][index1]).real * 40) - 1))) >= 0.00001)) {
                                while (component.dark_current * component.value * (Math.exp(res.elements[0][index1] * 40).real - 1) >= 1E10)
                                    component.value = component.value / 10;

                                temp = (component.value * component.dark_current * (Math.exp((res.elements[0][index1] * 40).real) - 1));
                                component.value = ((res.elements[0][index1]).real) / (component.dark_current * (Math.exp((res.elements[0][index1] * 40).real) - 1));
                                if ((res.elements[0][index1]).real > 0) {
                                    component.value = ((res.elements[0][index1]).real - (res.elements[0][index2]).real) / (component.dark_current * (Math.exp(40 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)) - 1));
                                    component.bias = false;
                                }
                                else {
                                    component.value = 0.025 / component.dark_current;
                                    component.bias = true;
                                }

                                check = true;
                            }
                        }


                        components[i] = component;
                        this.cleanCircuit();
                        this.createAMatrix();
                        this.createZMatrix(time_0);
                        aM = $M(this.AMatrix);
                        zM = $M(this.ZMatrix);
                        invAM = aM.inv();
                        res = zM.x(invAM);
                        res_previous = res;
                    }
                }
            } // when the iteration ends, the diode biases and dynamic resistances are correctly determined

            res_array.push(res);
            res_previous = res;
            time_0 = time_0 + 0.001 / frequency;
            res_array_state = res_array;

        }

        //alert(impedance_string);
        return res_array;
    };

    CiSo.prototype.getVoltageAt = function (node, time) {
        if (node === this.referenceNode) {
            return $Comp(0);
        }
        try {
            var res_array = this.solve(time);
            var res = res_array[Math.ceil(time * 100 * Math.max(this.frequency, 1000))];
            return res.elements[0][this.getNodeIndex(node)];
        } catch (e) {
            return $Comp(0);
        }
    };

    CiSo.prototype.getVoltageBetween = function (node1, node2, time) {
        return this.getVoltageAt(node1, time).subtract(this.getVoltageAt(node2, time));
    };

    CiSo.prototype.getCurrent = function (voltageSource, time) {
        var res,
				sources,
				sourceIndex = null,
				i, ii;

        try {
            var res_array = this.solve(time);
            res = res_array[Math.ceil(time * 100 * Math.max(this.frequency, 1000))];
        } catch (e) {
            return $Comp(0);
        }

        sources = this.voltageSources

        for (i = 0, ii = sources.length; i < ii; i++) {
            if (sources[i].id == voltageSource) {
                sourceIndex = i;
                break;
            }
        }

        if (sourceIndex === null) {
            try {
                throw Error("No voltage source " + voltageSource);
            } catch (e) {
                return $Comp(0);
            }
        }

        try {
            return res.elements[0][this.nodes.length - 1 + sourceIndex];
        } catch (e) {
            return $Comp(0);
        }
    }



    window.CiSo = CiSo;
})();


