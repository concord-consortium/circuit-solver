/*global window Complex */

(function () {

    var CiSo = function () {
        this.components = [];
        this.nodeMap = {};              // a map of nodes: {"n1": [comp1, comp2], "n2": [comp2, comp3] ...}
        this.nodes = [];                    // an array of all nodes
        this.voltageSources = [];
        this.currentSources = [];
        this.AMatrix = [];
        this.ZMatrix = [];
        this.referenceNode = null;
        this.referenceNodeIndex = null;
        this.frequency = [];
        this.maxInputFrequency = null;
        this.time = 0;
        this.maxResistance = 10;
        this.minResistance = 100000;
        this.maxCapacitance = 1e-8;
        this.minCapacitance = 1e-4;
        this.maxInductance = 0.01;
        this.minInductance = 100;
        this.RLC = true;  // checks if circuit is purely composed of resistors, inductors and capacitors
        this.RLCD = true; // checks if circuit is purely composed of resistors, inductors, capacitors and diodes
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

    var Component = function (id, type, value, nodes, dark_current, value_reverse, bias, charge, flux, voltage_source, current_source) {
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
            this.value = 10;
            this.value_reverse = 100000;
        }

        if (type === "Capacitor") {
            this.charge = 0;
            this.voltage_source = null;
        }

        if (type === "Inductor") {
            this.flux = 0;
            this.current_source = null;
        }
    };

    var twoPi = 2 * Math.PI;
    var res_array_state = [];

    Component.prototype.getImpedance = function () {
        var impedance = $Comp(0, 0);
        if (this.type === "Resistor") {
            impedance.real = this.value;
            impedance.imag = 0;
        }
        else if (this.type == "Capacitor") {
            impedance.real = 0;
            impedance.imag = 0;
        }

        else if (this.type == "Inductor") {
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

    var VoltageSource = function (id, Voltage, positiveNode, negativeNode, frequency, array) {
        this.id = id;
        this.Voltage = Voltage;
        this.positiveNode = positiveNode;
        this.negativeNode = negativeNode;
        this.frequency = frequency || 0;
        this.array = array;
    };


    var CurrentSource = function (id, Current, positiveNode, negativeNode, frequency, array) {
        this.id = id;
        this.Current = Current;
        this.positiveNode = positiveNode;
        this.negativeNode = negativeNode;
        this.frequency = frequency || 0;
        this.array = array;
    };


    CiSo.prototype.addComponent = function (id, type, value, nodeLabels, dark_current, value_reverse, bias, charge, flux, voltage_source, current_source) {
        var component = new Component(id, type, value, nodeLabels, dark_current, value_reverse, bias, charge, flux, voltage_source, current_source), // Make a new component with the right properties
                i, ii, node;

        if (type === "Resistor") {

            if (value >= this.maxResistance)
                this.maxResistance = value;
            if (value <= this.minResistance)
                this.minResistance = value;

        }

        else if (type === "Capacitor") {

            if (value >= this.maxCapacitance)
                this.maxCapacitance = value;
            if (value <= this.minCapacitance)
                this.minCapacitance = value;


            charge = 0;

            var component_capacitor = new Component((id + '_res'), "Resistor", 0, [nodeLabels[0], nodeLabels[1]], dark_current, value_reverse, bias, charge, flux, voltage_source, current_source);

            var source = new VoltageSource(id + "VoltageSource", charge / value, nodeLabels[0], nodeLabels[1], Math.abs(Math.max.apply(Math, this.frequency)));     
            voltage_source = source;
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

            this.nodeMap[positiveNode].push(component_capacitor);
            this.nodeMap[negativeNode].push(component_capacitor);

        }

        else if (type === "Inductor") {


            if (value >= this.maxInductance)
                this.maxInductance = value;
            if (value <= this.minInductance)
                this.minInductance = value;


            flux = 0;

            var component_inductor = new Component((id + '_res'), "Resistor", 0, [nodeLabels[0], nodeLabels[1]], dark_current, value_reverse, bias, charge, flux, voltage_source, current_source);

            var source = new CurrentSource(id + "CurrentSource", flux / value, nodeLabels[0], nodeLabels[1], Math.abs(Math.max.apply(Math, this.frequency)));
            current_source = source;
            this.currentSources.push(source);        

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

            this.nodeMap[positiveNode].push(component_inductor);
            this.nodeMap[negativeNode].push(component_inductor);
        }

        else if (type === "MOSFET") {

            this.RLC = false;
            this.RLCD = false;

            var component_MOSFET = new Component((id + '_res'), "MOSFET", 100, [nodeLabels[0], nodeLabels[2]], dark_current, value_reverse, bias, charge, flux, voltage_source, current_source);

            var source = new CurrentSource(id + "CurrentSource", 0, nodeLabels[0], nodeLabels[2], Math.max.apply(Math, this.frequency));
            current_source = source;
            this.currentSources.push(source);        

            var drainNode = nodeLabels[0];
            var gateNode = nodeLabels[1];
            var sourceNode = nodeLabels[2];


            if (!this.nodeMap[drainNode]) {
                this.nodeMap[drainNode] = [];
                this.nodes.push(drainNode);
            }

            if (!this.nodeMap[gateNode]) {
                this.nodeMap[gateNode] = [];
                this.nodes.push(gateNode);
            }

            if (!this.nodeMap[sourceNode]) {
                this.nodeMap[sourceNode] = [];
                this.nodes.push(sourceNode);
            }

            this.nodeMap[sourceNode].push(component_MOSFET);
            this.nodeMap[gateNode].push(component_MOSFET);
            this.nodeMap[drainNode].push(component_MOSFET);

        }

        else if (type === "Diode") {
            this.RLC = false;
        }


        if (type === "Transistor") { // modelling a BJT as a combination of two diodes and two current sources

            this.RLC = false;
            this.RLCD = false;

            var nodeLabels_diode_1 = [nodeLabels[1], nodeLabels[0]];
            var nodeLabels_diode_2 = [nodeLabels[1], nodeLabels[2]];

            var component_diode_1 = new Component((id + '1'), "Diode", value, nodeLabels_diode_1, dark_current, value_reverse, bias, charge, flux, voltage_source, current_source);
            var component_diode_2 = new Component((id + '2'), "Diode", value, nodeLabels_diode_2, dark_current, value_reverse, bias, charge, flux, voltage_source, current_source);
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

            var source = new CurrentSource(id + "2CurrentSource_CB", 0, nodeLabels[1], nodeLabels[0], Math.max.apply(Math, this.frequency));
            current_source = source;
            this.currentSources.push(source);        

            source = new CurrentSource(id + "1CurrentSource_CE", 0, nodeLabels[1], nodeLabels[2], Math.max.apply(Math, this.frequency));
            current_source = source;
            this.currentSources.push(source); 
        }

        else {

            component = new Component(id, type, value, nodeLabels, dark_current, value_reverse, bias, charge, flux, voltage_source, current_source);

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

    CiSo.prototype.addVoltageSource = function (id, Voltage, positiveNode, negativeNode, frequency, array) {
        this.frequency.push(frequency);
        if(frequency > this.maxInputFrequency)
            this.maxInputFrequency = frequency;
        var source = new VoltageSource(id, Voltage, positiveNode, negativeNode, this.frequency[this.frequency.length - 1], array);
        this.voltageSources.push(source);

        if (!this.nodeMap[positiveNode]) {
            this.nodeMap[positiveNode] = [];
            this.nodes.push(positiveNode);
        }

        if (!this.nodeMap[negativeNode]) {
            this.nodeMap[negativeNode] = [];
            this.nodes.push(negativeNode);
        }

        if (!this.referenceNode && this.frequency.length == 1) {
            this.setReferenceNode(negativeNode);
        }
    };

    CiSo.prototype.addCurrentSource = function (id, Current, positiveNode, negativeNode, frequency, array) {
        this.frequency.push(frequency);
        if(frequency > this.maxInputFrequency)
            this.maxInputFrequency = frequency;
        var source = new CurrentSource(id, Current, positiveNode, negativeNode, this.frequency[this.frequency.length - 1], array);
        this.currentSources.push(source);

        if (!this.nodeMap[positiveNode]) {
            this.nodeMap[positiveNode] = [];
            this.nodes.push(positiveNode);
        }

        if (!this.nodeMap[negativeNode]) {
            this.nodeMap[negativeNode] = [];
            this.nodes.push(negativeNode);
        }

        if (!this.referenceNode && this.frequency.length == 1) {
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
                numVoltageSources = this.voltageSources.length,
                arraySize = numNodes - 1 + numVoltageSources,
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

        else if (this.currentSources.length > 0) {
            source = this.currentSources[0];
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
        if (this.voltageSources.length === 0 && this.currentSources.length === 0) return;

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
                numVoltageSources = this.voltageSources.length;
                numSources = this.voltageSources.length + this.currentSources.length,
                arraySize = numNodes - 1 + numVoltageSources,
                sources = this.voltageSources;
        var i, j;
        var nodeIndex;

        this.ZMatrix = [[]];

        for (i = 0; i < arraySize; i++) {
            this.ZMatrix[0][i] = cZero.copy()
        }

        if (time >= 0) {
            for (i = 0; i < sources.length; i++) {
                if (sources[i].frequency >= 0)
                    this.ZMatrix[0][numNodes - 1 + i].real = (sources[i].Voltage * Math.sin(twoPi * sources[i].frequency * time));
                else
                    if (-1 * time * sources[i].frequency <= sources[i].array.length)
                        this.ZMatrix[0][numNodes - 1 + i].real = (sources[i].array[-1 * Math.ceil(time * sources[i].frequency)]); //negative frequency implies that the input is a step input with each Voltage staying constant for a time preiod equal to 1/|frequency|
                    else
                        this.ZMatrix[0][numNodes - 1 + i].real = sources[i].Voltage;
            }
        }

        sources = this.currentSources;

        for (i = 0; i < sources.length; i++) {
            source = sources[i];
            posNode = source.positiveNode;
            if (posNode !== this.referenceNode) {
                nodeIndex = this.getNodeIndex(posNode);
                if (time >= 0) {
                    if (sources[i].frequency >= 0)
                        this.ZMatrix[0][nodeIndex].real = (sources[i].Current * Math.sin(twoPi * sources[i].frequency * time));
                    else
                        if (-1 * time * sources[i].frequency <= sources[i].array.length)
                            this.ZMatrix[0][nodeIndex].real = (sources[i].array[-1 * Math.ceil(time * sources[i].frequency)]); //negative frequency implies that the input is a step input with each Voltage staying constant for a time preiod equal to 1/|frequency|
                        else
                            this.ZMatrix[0][nodeIndex].real = sources[i].Current;
                    
                }
            }

            else {
                nodeIndex = this.getNodeIndex(negNode);
                if (time >= 0) {
                    if (sources[i].frequency >= 0)
                        this.ZMatrix[0][nodeIndex].real = -1*(sources[i].Current * Math.sin(twoPi * sources[i].frequency * time));
                    else
                        if (-1 * time * sources[i].frequency <= sources[i].array.length)
                            this.ZMatrix[0][nodeIndex].real = -1*(sources[i].array[-1 * Math.ceil(time * sources[i].frequency)]); //negative frequency implies that the input is a step input with each Voltage staying constant for a time preiod equal to 1/|frequency|
                        else
                            this.ZMatrix[0][nodeIndex].real = -1*sources[i].Current;
                    
                }
            }
        }   
    };

    /**
     * Here we delete any nodes, components and Voltage sources that have
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

            if (!connectedComponents || connectedComponents.length === 0) {
                return false;
            }

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

        if (this.RLCD) {
            for (i = 0, ii = components.length; i < ii; i++) {
                component = components[i];
                if (!(~nodes.indexOf(component.nodes[0]) && ~nodes.indexOf(component.nodes[1]))) {
                    removeComponentFromNodeMap(component, component.nodes[0]);
                    removeComponentFromNodeMap(component, component.nodes[1]);
                    components[i] = null;
                }
            }
        } 

        this.components = squash(components);

        // Remove all Voltage sources that aren't attached to two reachable nodes
        for (i = 0, ii = this.voltageSources.length; i < ii; i++) {
            source = this.voltageSources[i];
            if (!(~nodes.indexOf(source.positiveNode) && ~nodes.indexOf(source.negativeNode))) {
                this.voltageSources[i] = null;
            }
        }

        this.voltageSources = squash(this.voltageSources);

        for (i = 0, ii = this.currentSources.length; i < ii; i++) {
            source = this.currentSources[i];
            if (!(~nodes.indexOf(source.positiveNode) && ~nodes.indexOf(source.negativeNode))) {
                this.currentSources[i] = null;
            }
        }

        this.currentSources = squash(this.currentSources);

        // Reset reference node index
        this.referenceNodeIndex = this.nodes.indexOf(referenceNode);
    };

    CiSo.prototype.solve_RLC = function () {

        this.cleanCircuit();

        this.createAMatrix();
        this.createZMatrix();

        aM = $M(this.AMatrix);
        zM = $M(this.ZMatrix);
        invAM = aM.inv();
        res = zM.x(invAM);
        return res;
    };


    CiSo.prototype.solve = function (time) {


        components = this.components;
        voltageSources = this.voltageSources;
        currentSources = this.currentSources;
        var frequency = Math.max.apply(Math, this.frequency);
        frequency = Math.max(frequency, (1/this.minResistance)/this.minCapacitance, this.maxResistance/this.minInductance, Math.sqrt((1/this.minInductance)/this.minCapacitance), 1000);
        var res_array = [];
        var time_0 = 0;

        this.cleanCircuit();

        this.createAMatrix();
        this.createZMatrix(time_0);

        aM = $M(this.AMatrix);
        zM = $M(this.ZMatrix);
        invAM = aM.inv();

        var res_previous = zM.x(invAM);
        var j, jj, k, kk;

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
                            component.charge = 0; // stores state corresponding to charge => all caps are uncharged at time = 0
                        else {
                            var voltageSources = this.voltageSources;
                            var sourceIndex = null;
                            var Current = null;

                            for (j = 0, jj = voltageSources.length; j < jj; j++) {
                                if (voltageSources[j].id == component.id + "VoltageSource") {
                                    sourceIndex = j;
                                    break;
                                }
                            }

                            Current = res_previous.elements[0][this.nodes.length - 1 + sourceIndex];

                            component.charge = component.charge + 0.001 * 0.5 * Current.real / Math.abs(this.maxInputFrequency);

                            voltageSources[sourceIndex].Voltage = component.charge / value;
                        }
                    }


                    else if (component.type === "Inductor") {
                        if (time_0 === 0)
                            component.flux = 0; //stores state corresponding to flux => all inductors are unmagnetized at time = 0
                        else {
                            var currentSources = this.currentSources;
                            var sourceIndex = null;
                            var Voltage = null;



                            for (j = 0, jj = currentSources.length; j < jj; j++) {
                                if (currentSources[j].id == component.id + "CurrentSource") {
                                    sourceIndex = j;
                                    break;
                                }
                            }
                            

                            if (index1 != -1 && index2 != -1)
                                Voltage = res_previous.elements[0][index1] - res_previous.elements[0][index2];
                            else if (index1 === -1)
                                Voltage = -res_previous.elements[0][index2];
                            else
                                Voltage = res_previous.elements[0][index1];


                            component.flux = component.flux - 0.001 * 0.5 * Voltage.real / Math.abs(this.maxInputFrequency);
                                                                                    
                            currentSources[sourceIndex].Current = component.flux / value;
                        }
                    }

                    else if (component.type === "MOSFET") {

                        var currentSources = this.currentSources;
                        var sourceIndex = null;

                        if (index2 != -1)
                            var gateVoltage = res_previous.elements[0][index2].real;
                        else
                            var gateVoltage = 0;

                        if (index1 != -1)
                            var drainVoltage = res_previous.elements[0][index1].real;
                        else
                            var drainVoltage = 0;

                        if (this.getNodeIndex(nodes[2]) != -1)
                            var sourceVoltage = res_previous.elements[0][this.getNodeIndex(nodes[2])].real;
                        else
                            var sourceVoltage = 0;


                        for (j = 0, jj = currentSources.length; j < jj; j++) {
                            if (currentSources[j].id == component.id + "CurrentSource") {
                                sourceIndex = j;
                                break;
                            }
                        }

                        if(gateVoltage - sourceVoltage < 0.7)
                            
                            currentSources[sourceIndex].Current = 0;

                        else {

                            if(drainVoltage < gateVoltage - 0.7)
                                currentSources[sourceIndex].Current = 0.01 * (gateVoltage - 0.5 * sourceVoltage - 0.5 * drainVoltage - 0.7) * (drainVoltage - sourceVoltage);

                            else
                                currentSources[sourceIndex].Current = 0.01 * 0.5 * (gateVoltage - sourceVoltage - 0.7) * (gateVoltage - sourceVoltage - 0.7);

                        }
                    }

                    if (component.type === "Diode") {

                        var currentSources = this.currentSources;
                        var sourceIndex = null;
                        var indicator = 2; //indicates whether the current source is for the C-B junction or the C-E junction, coded by 0 and 1 respectively



                        for (j = 0, jj = currentSources.length; j < jj; j++) {
                            if (currentSources[j].id == component.id + "CurrentSource_CB") {
                                indicator = 0;
                                sourceIndex = j;
                                break;
                            }

                            else if (currentSources[j].id == component.id + "CurrentSource_CE") {
                                indicator = 1;
                                sourceIndex = j;
                                break;
                            }

                        }

                        if (indicator != 2) {

                            if (index1 != -1 && index2 != -1) {
                                
                                if (((res.elements[0][index1]).real - (res.elements[0][index2]).real < 0 && (value < value_reverse)) || ((res.elements[0][index1]).real - (res.elements[0][index2]).real > 0 && (value > value_reverse))) {
                                    
                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value_reverse;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value_reverse;                            
                            
                                }

                                else {

                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value;

                                }
                            }

                            else if (index1 === -1) {
                                
                                if (( - (res.elements[0][index2]).real < 0 && (value < value_reverse)) || ( - (res.elements[0][index2]).real > 0 && (value > value_reverse))) {
                                
                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * - (res.elements[0][index2]).real/value_reverse;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  - (res.elements[0][index2]).real/value_reverse;                            
                            
                                }

                                else {

                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 *  - (res.elements[0][index2]).real/value;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  - (res.elements[0][index2]).real/value;

                                }
                            }

                            else if (index2 === -1) {
                                
                                if (( (res.elements[0][index1]).real < 0 && (value < value_reverse)) || ((res.elements[0][index1]).real > 0 && (value > value_reverse))) {
                                
                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * (res.elements[0][index1]).real/value_reverse;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  (res.elements[0][index1]).real/value_reverse;                            
                            
                                }

                                else {

                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 *  (res.elements[0][index1]).real/value;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  (res.elements[0][index1]).real/value;

                                }
                            }
                        }

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


                    if(component.type === "Diode") {
                        var currentSources = this.currentSources;
                        var sourceIndex = null;
                        var indicator = 2; //indicates whether the current source is for the C-B junction or the C-E junction, coded by 0 and 1 respectively



                        for (j = 0, jj = currentSources.length; j < jj; j++) {
                            if (currentSources[j].id == component.id + "CurrentSource_CB") {
                                indicator = 0;
                                sourceIndex = j;
                                break;
                            }

                            else if (currentSources[j].id == component.id + "CurrentSource_CE") {
                                indicator = 1;
                                sourceIndex = j;
                                break;
                            }

                        }

                        if (indicator != 2) {

                            if (index1 != -1 && index2 != -1) {
                                
                                if (((res.elements[0][index1]).real - (res.elements[0][index2]).real < 0 && (value < value_reverse)) || ((res.elements[0][index1]).real - (res.elements[0][index2]).real > 0 && (value > value_reverse))) {
                                    
                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value_reverse;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value_reverse;                            
                            
                                }

                                else {

                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 * ((res.elements[0][index1]).real - (res.elements[0][index2]).real)/value;

                                }
                            }

                            else if (index1 === -1) {
                                
                                if (( - (res.elements[0][index2]).real < 0 && (value < value_reverse)) || ( - (res.elements[0][index2]).real > 0 && (value > value_reverse))) {
                                
                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * - (res.elements[0][index2]).real/value_reverse;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  - (res.elements[0][index2]).real/value_reverse;                            
                            
                                }

                                else {

                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 *  - (res.elements[0][index2]).real/value;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  - (res.elements[0][index2]).real/value;

                                }
                            }

                            else if (index2 === -1) {
                                
                                if (( (res.elements[0][index1]).real < 0 && (value < value_reverse)) || ((res.elements[0][index1]).real > 0 && (value > value_reverse))) {
                                
                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 * (res.elements[0][index1]).real/value_reverse;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  (res.elements[0][index1]).real/value_reverse;                            
                            
                                }

                                else {

                                    if (indicator)
                                        currentSources[sourceIndex].Current = 0.02 *  (res.elements[0][index1]).real/value;
                                    else 
                                        currentSources[sourceIndex].Current = 0.98 *  (res.elements[0][index1]).real/value;

                                }
                            }
                        }

                    if (component.bias === false) {
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
                                    component.value = ( -(res.elements[0][index2]).real) / (component.dark_current * (Math.exp(40 * (-(res.elements[0][index2]).real)) - 1));
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
                                    component.value = ((res.elements[0][index1]).real) / (component.dark_current * (Math.exp(40 * ((res.elements[0][index1]).real)) - 1));
                                    component.bias = false;
                                }
                                else {
                                    component.value = 0.025 / component.dark_current;
                                    component.bias = true;
                                }

                                check = true;
                            }
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
        return res_array;
    };

    CiSo.prototype.getVoltageAt = function (node, time) {
        if (node === this.referenceNode) {
            return 0;
        }
        try {

            var res = null;

            if(this.RLC)
                res = this.solve_RLC();
            else {
                var res_array = this.solve(time);
                res = res_array[res_array.length - 1];
            }

            return res.elements[0][this.getNodeIndex(node)].real;
        } catch (e) {
            return 0;
        }
    };

    CiSo.prototype.getVoltageAt_array = function (node, time) {

        var i;
        var res_array = this.solve(time);
        var voltage_array = [];
        
        for (i = 0; i < res_array.length; i++) {

            if (node === this.referenceNode) {
                voltage_array.push(0);
            }

            voltage_array.push(res_array[i].elements[0][this.getNodeIndex(node)].real);
        
        }

        return voltage_array;
    };

    CiSo.prototype.getVoltageBetween = function (node1, node2, time) {
        return (this.getVoltageAt(node1, time) - this.getVoltageAt(node2, time));
    };

    CiSo.prototype.getVoltageBetween_array = function (node1, node2, time) {
        var voltage1 = this.getVoltageAt_array(node1, time);
        var voltage2 = this.getVoltageAt_array(node2, time);
        var voltage_array = [];

        var i = 0;

        while (i < voltage1.length) {
            voltage_array.push(voltage1[i] - voltage2[i]);
        }
        return voltage_array;
    };

    CiSo.prototype.getCurrent = function (voltageSource, time) {
        var res,
                sources,
                sourceIndex = null,
                i, ii;

        try {
            var res_array = this.solve(time);
            res = res_array[res_array.length - 1];
        } catch (e) {
            return 0;
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
                throw Error("No Voltage source " + voltageSource);
            } catch (e) {
                return 0;
            }
        }

        try {
            return res.elements[0][this.nodes.length - 1 + sourceIndex].real;
        } catch (e) {
            return 0;
        }
    }



    window.CiSo = CiSo;
})();





var Complex = function(real, imag) {
  if (!(this instanceof Complex)) {
    return new Complex (real, imag);
  }

  if (typeof real === "string" && imag === null) {
    return Complex.parse (real);
  }

  this.real = real || 0;
  this.imag = imag || 0;

  this.magnitude  = Math.sqrt(this.real*this.real + this.imag*this.imag);
  this.angle      = Math.atan2(this.imag, this.real);
};

Complex.prototype = {
  copy: function() {
    return new Complex (this.real, this.imag);
  },

  add: function(operand) {
    var real, imag;

    if (operand instanceof Complex) {
      real = operand.real;
      imag = operand.imag;
    } else {
      real = operand;
      imag = 0;
    }
    return new Complex(this.real + real, this.imag + imag);
  },

  subtract: function(operand) {
    var real, imag;

    if (operand instanceof Complex) {
      real = operand.real;
      imag = operand.imag;
    } else {
      real = operand;
      imag = 0;
    }
    return new Complex(this.real - real, this.imag - imag);
  },

  multiply: function(operand) {
    var real, imag, newReal, newImag;

    if (operand instanceof Complex) {
      real = operand.real;
      imag = operand.imag;
    } else {
      real = operand;
      imag = 0;
    }

    newReal = this.real * real - this.imag * imag;
    newImag = this.real * imag + this.imag * real;

    return new Complex(newReal, newImag);
  },

  divide: function(operand) {
    var real, imag, denom, newReal, newImag;

    if (operand instanceof Complex) {
      real = operand.real;
      imag = operand.imag;
    } else {
      real = operand;
      imag = 0;
    }

    denom = real * real + imag * imag;
    newReal = (this.real * real + this.imag * imag) / denom;
    newImag = (this.imag * real - this.real * imag) / denom;

    return new Complex(newReal, newImag);
  },

  inverse: function() {
    var one = new Complex (1,0);
    return one.divide(this);
  },

  negative: function() {
    var zero = new Complex (0,0);
    return zero.subtract(this);
  },

  equals: function(num) {
    if (num instanceof Complex) {
      return this.real === num.real && this.imag === num.imag;
    } else if (typeof num === "number") {
      return this.real === num && this.imag === 0;
    }
    return false;
  },

  toString: function() {
    return this.real + "i" + this.imag;
  }
};

// expect a+bi format
Complex.parse = function(str) {
  if (!str) {
    return null;
  }

  var parts = /(.*)([+,\-].*i)/.exec(str),  // try to tranform 'str' into [str, real, imaginary]
      real,
      imaginary;

  if (parts && parts.length === 3) {
    real      = parseFloat(parts[1]);
    imaginary = parseFloat(parts[2].replace("i", ""));  // imag. is of form (+/-)123i. We remove the i, but keep the +/-
  } else {
    real      = parseFloat(str);
    imaginary = 0;
  }

  if ( isNaN(real) || isNaN(imaginary) ) {
    throw new Error("Invalid input to Complex.parse, expecting a + bi format, instead was: "+str);
  }

  return new Complex(real, imaginary);
};

// Constructor functions
$Comp = function() {
  if (typeof arguments[0] === "string") {
    return Complex.parse(arguments[0]);
  }
  return new Complex(arguments[0],arguments[1]);
};



// === Sylvester ===
// Vector and Matrix mathematics modules for JavaScript
// Copyright (c) 2007 James Coglan
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

// === Updated library ===
//
// Library modified to use Complex Numbers and reduced to include only functions needed
// by The Concord Consortium's Circuit Solver (CiSo) software by Sam Fentress,
// The Concord Consortium, Jan 7th 2013
//
// Version bumped from 0.1.3 to 0.1.3-cc

var Sylvester = {
  version: '0.1.3-cc',
  precision: 1e-6
};

function Matrix() {}
Matrix.prototype = {

  // Returns a copy of the matrix
  dup: function() {
    return Matrix.create(this.elements);
  },

  // Returns true iff the matrix can multiply the argument from the left
  canMultiplyFromLeft: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    // this.columns should equal matrix.rows
    return (this.elements[0].length == M.length);
  },

  // Returns the result of multiplying the matrix from the right by the argument.
  // If the argument is a scalar then just multiply all the elements. If the argument is
  // a vector, a vector is returned, which saves you having to remember calling
  // col(1) on the result.
  multiply: function(matrix) {
    if (!matrix.elements) {
      return this.map(function(x) { return x.multiply(matrix); });
    }
    var returnVector = matrix.modulus ? true : false;
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.canMultiplyFromLeft(M)) { return null; }
    var ni = this.elements.length, ki = ni, i, nj, kj = M[0].length, j;
    var cols = this.elements[0].length, elements = [], sum, nc, c;
    do { i = ki - ni;
      elements[i] = [];
      nj = kj;
      do { j = kj - nj;
        sum = $Comp(0,0);
        nc = cols;
        do { c = cols - nc;
          sum = sum.add(this.elements[i][c].multiply(M[c][j]));
        } while (--nc);
        elements[i][j] = sum;
      } while (--nj);
    } while (--ni);
    var M = Matrix.create(elements);
    return returnVector ? M.col(1) : M;
  },

  x: function(matrix) { return this.multiply(matrix); },

  // Returns true iff the matrix is square
  isSquare: function() {
    return (this.elements.length == this.elements[0].length);
  },

  // Make the matrix upper (right) triangular by Gaussian elimination.
  // This method only adds multiples of rows to other rows. No rows are
  // scaled up or switched, and the determinant is preserved.
  toRightTriangular: function() {
    var M = this.dup(), els;
    var n = this.elements.length, k = n, i, np, kp = this.elements[0].length, p;
    do { i = k - n;
      if (M.elements[i][i].equals(0)) {
        for (j = i + 1; j < k; j++) {
          if (!M.elements[j][i].equals(0)) {
            els = []; np = kp;
            do { p = kp - np;
              els.push(M.elements[i][p].add(M.elements[j][p]));
            } while (--np);
            M.elements[i] = els;
            break;
          }
        }
      }
      if (!M.elements[i][i].equals(0)) {
        for (j = i + 1; j < k; j++) {
          var multiplier = M.elements[j][i].divide(M.elements[i][i]);
          els = []; np = kp;
          do { p = kp - np;
            // Elements with column numbers up to an including the number
            // of the row that we're subtracting can safely be set straight to
            // zero, since that's the point of this routine and it avoids having
            // to loop over and correct rounding errors later
            els.push(p <= i ? $Comp(0) : M.elements[j][p].subtract(M.elements[i][p].multiply(multiplier)));
          } while (--np);
          M.elements[j] = els;
        }
      }
    } while (--n);
    return M;
  },

  toUpperTriangular: function() { return this.toRightTriangular(); },

  // Returns the determinant for square matrices
  determinant: function() {
    if (!this.isSquare()) { return null; }
    var M = this.toRightTriangular();
    var det = M.elements[0][0], n = M.elements.length - 1, k = n, i;
    do { i = k - n + 1;
      det = det.multiply(M.elements[i][i]);
    } while (--n);
    return det;
  },

  det: function() { return this.determinant(); },

  // Returns true iff the matrix is singular
  isSingular: function() {
    return (this.isSquare() && this.determinant().equals(0));
  },

  // Returns the result of attaching the given argument to the right-hand side of the matrix
  augment: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    var T = this.dup(), cols = T.elements[0].length;
    var ni = T.elements.length, ki = ni, i, nj, kj = M[0].length, j;
    if (ni != M.length) { return null; }
    do { i = ki - ni;
      nj = kj;
      do { j = kj - nj;
        T.elements[i][cols + j] = M[i][j];
      } while (--nj);
    } while (--ni);
    return T;
  },

  // Returns the inverse (if one exists) using Gauss-Jordan
  inverse: function() {
    if (!this.isSquare() || this.isSingular()) { return null; }
    var ni = this.elements.length, ki = ni, i, j;
    var M = this.augment(Matrix.I(ni)).toRightTriangular();
    var np, kp = M.elements[0].length, p, els, divisor;
    var inverse_elements = [], new_element;
    // Matrix is non-singular so there will be no zeros on the diagonal
    // Cycle through rows from last to first
    do { i = ni - 1;
      // First, normalise diagonal elements to 1
      els = []; np = kp;
      inverse_elements[i] = [];
      divisor = M.elements[i][i];
      do { p = kp - np;
        new_element = M.elements[i][p].divide(divisor);
        els.push(new_element);
        // Shuffle of the current row of the right hand side into the results
        // array as it will not be modified by later runs through this loop
        if (p >= ki) { inverse_elements[i].push(new_element); }
      } while (--np);
      M.elements[i] = els;
      // Then, subtract this row from those above it to
      // give the identity matrix on the left hand side
      for (j = 0; j < i; j++) {
        els = []; np = kp;
        do { p = kp - np;
          els.push(M.elements[j][p].subtract(M.elements[i][p].multiply(M.elements[j][i])));
        } while (--np);
        M.elements[j] = els;
      }
    } while (--ni);
    return Matrix.create(inverse_elements);
  },

  inv: function() { return this.inverse(); },

  // Set the matrix's elements from an array. If the argument passed
  // is a vector, the resulting matrix will be a single column.
  setElements: function(els) {
    var i, elements = els.elements || els;
    if (typeof(elements[0][0]) != 'undefined') {
      var ni = elements.length, ki = ni, nj, kj, j;
      this.elements = [];
      do { i = ki - ni;
        nj = elements[i].length; kj = nj;
        this.elements[i] = [];
        do { j = kj - nj;
          this.elements[i][j] = elements[i][j];
        } while (--nj);
      } while(--ni);
      return this;
    }
    var n = elements.length, k = n;
    this.elements = [];
    do { i = k - n;
      this.elements.push([elements[i]]);
    } while (--n);
    return this;
  }
};

// Constructor function
Matrix.create = function(elements) {
  var M = new Matrix();
  return M.setElements(elements);
};

// Identity matrix of size n
Matrix.I = function(n) {
  var els = [], k = n, i, nj, j;
  do { i = k - n;
    els[i] = []; nj = k;
    do { j = k - nj;
      els[i][j] = (i == j) ? $Comp(1,0) : $Comp(0);
    } while (--nj);
  } while (--n);
  return Matrix.create(els);
};

// Utility functions
var $M = Matrix.create;
