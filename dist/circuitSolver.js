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

    var Component = function (id, type, value, nodes, value_reverse) {
        this.id = id;
        this.type = type;
        this.value = value;
        this.nodes = nodes;
        if (type === "Diode")
            this.value_reverse = value_reverse;
        else
            this.value_reverse = value;
    };

    var twoPi = 2 * Math.PI;

    Component.prototype.getImpedance = function (frequency) {
        var impedance = $Comp(0, 0);
        if (this.type === "Resistor") {
            impedance.real = this.value;
            impedance.imag = 0;
        }
        else if (this.type == "Capacitor") {
            impedance.real = 0;
            impedance.imag = -1 / (twoPi * frequency * this.value);
        }
        else if (this.type == "Inductor") {
            impedance.real = 0;
            impedance.imag = twoPi * frequency * this.value;
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

    var VoltageSource = function (id, voltage, positiveNode, negativeNode, frequency) {
        this.id = id;
        this.voltage = voltage;
        this.positiveNode = positiveNode;
        this.negativeNode = negativeNode;
        this.frequency = frequency || 0;
    };

    CiSo.prototype.addComponent = function (id, type, value, nodeLabels, value_reverse) {
        var component = new Component(id, type, value, nodeLabels, value_reverse), // Make a new component with the right properties
				i, ii, node;

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
    };

    CiSo.prototype.addVoltageSource = function (id, voltage, positiveNode, negativeNode, frequency) {
        var source = new VoltageSource(id, voltage, positiveNode, negativeNode, frequency);
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

    CiSo.prototype.createZMatrix = function () {
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
            if (!(~nodes.indexOf(component.nodes[0]) && ~nodes.indexOf(component.nodes[1]))) {
                removeComponentFromNodeMap(component, component.nodes[0]);
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

    CiSo.prototype.solve = function () {

        components = this.components;

        this.cleanCircuit();

        this.createAMatrix();
        this.createZMatrix();

        aM = $M(this.AMatrix);
        zM = $M(this.ZMatrix);
        invAM = aM.inv();
        res = zM.x(invAM);


        var check = true, i, ii, temp;
        while (check === true) {
            check = false;
            for (i = 0, ii = components.length; i < ii; i++) {
                var component = components[i];
                var nodes = component.nodes;
                var node1 = nodes[0];
                var node2 = nodes[1];
                var index1 = this.getNodeIndex(node1);
                var index2 = this.getNodeIndex(node2);
                var frequency = this.frequency;
                var time = this.time;
                if (component.type === "Diode") {
                    if (index1 != -1 && index2 != -1) {
                        if (((res.elements[0][index1]).real - (res.elements[0][index2]).real < 0 && (component.value < component.value_reverse)) || ((res.elements[0][index1]).real - (res.elements[0][index2]).real > 0 && (component.value > component.value_reverse))) {
                            temp = component.value_reverse;
                            component.value_reverse = component.value;
                            component.value = temp;

                            check = true;
                        }
                    }

                    else if (index1 === -1) {
                        if ((res.elements[0][index2].real > 0 && (component.value < component.value_reverse)) || (res.elements[0][index2].real < 0 && (component.value > component.value_reverse))) {
                            temp = component.value_reverse;
                            component.value_reverse = component.value;
                            component.value = temp;

                            check = true;
                        }
                    }

                    else if (index2 === -1) {
                        if ((res.elements[0][index1].real < 0 && (component.value < component.value_reverse)) || (res.elements[0][index1].real > 0 && (component.value > component.value_reverse))) {
                            temp = component.value_reverse;
                            component.value_reverse = component.value;
                            component.value = temp;

                            check = true;
                        }
                    }


                    components[i] = component;
                    this.cleanCircuit();
                    this.createAMatrix();
                    aM = $M(this.AMatrix);
                    zM = $M(this.ZMatrix);
                    invAM = aM.inv();
                    res = zM.x(invAM);
                }
            }
        } // when the iteration ends, the diode biases are correctly determined

        return res;
    };

    CiSo.prototype.getVoltageAt = function (node) {
        if (node === this.referenceNode) {
            return $Comp(0);
        }
        try {
            var res = this.solve();
            return res.elements[0][this.getNodeIndex(node)];
        } catch (e) {
            return $Comp(0);
        }
    };

    CiSo.prototype.getVoltageBetween = function (node1, node2) {
        return this.getVoltageAt(node1).subtract(this.getVoltageAt(node2));
    };

    CiSo.prototype.getCurrent = function (voltageSource) {
        var res,
				sources,
				sourceIndex = null,
				i, ii;

        try {
            res = this.solve();
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
