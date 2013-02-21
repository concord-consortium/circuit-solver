describe("CircuitSolver", function() {

	describe("Adding components", function() {

		var ciso = new CiSo();

		it("We can add a component", function() {
			ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
			numComponents = ciso.components.length;
			firstComponentLabel = ciso.components[0].id;
			firstComponentType = ciso.components[0].type;
			firstComponentValue = ciso.components[0].value;
			firstComponentNodes = ciso.components[0].nodes;
			expect(numComponents).toBe(1);
			expect(firstComponentLabel).toBe("R1");
			expect(firstComponentType).toBe("Resistor");
			expect(firstComponentValue).toBe(5000);
			expect(firstComponentNodes[0]).toBe("n1");
			expect(firstComponentNodes[1]).toBe("n2");
		});


	 it("We can add a second component", function() {
			ciso.addComponent("C1", "Capacitor", 0.000001, ["n2", "n3"]);
			numComponents = ciso.components.length;
			secondComponentLabel = ciso.components[1].id;
			secondComponentType = ciso.components[1].type;
			secondComponentValue = ciso.components[1].value;
			secondComponentNodes = ciso.components[1].nodes;
			expect(numComponents).toBe(2);
			expect(secondComponentLabel).toBe("C1");
			expect(secondComponentType).toBe("Capacitor");
			expect(secondComponentValue).toBe(0.000001);
			expect(secondComponentNodes[0]).toBe("n2");
			expect(secondComponentNodes[1]).toBe("n3");
		});

		it("We can add a third component", function() {
			ciso.addComponent("L1", "Inductor", 0.00002, ["n3", "n4"]);
			numComponents = ciso.components.length;
			thirdComponentLabel = ciso.components[2].id;
			thirdComponentType = ciso.components[2].type;
			thirdComponentValue = ciso.components[2].value;
			thirdComponentNodes = ciso.components[2].nodes;
			expect(numComponents).toBe(3);
			expect(thirdComponentLabel).toBe("L1");
			expect(thirdComponentType).toBe("Inductor");
			expect(thirdComponentValue).toBe(0.00002);
			expect(thirdComponentNodes[0]).toBe("n3");
			expect(thirdComponentNodes[1]).toBe("n4");
		});

		it("We can compute the complex impedance of a component given a frequency", function() {
			var testComponent0 = ciso.components[0];
			var testComponent1 = ciso.components[1];
			var testComponent2 = ciso.components[2];
			var frequency = 2000;
			expect(testComponent0.getImpedance(frequency)).toBeComplex(5000, 0);
			expect(testComponent1.getImpedance(frequency)).toBeComplex(0, -1/(2*Math.PI*frequency*testComponent1.value));
			expect(testComponent2.getImpedance(frequency)).toBeComplex(0, 0.251);
		});

	});

	describe("Adding voltage sources", function() {
		it("We can add an DC voltage source", function() {
			var ciso = new CiSo();
			ciso.addVoltageSource("DCV1",15,"n1","n4");
			expect(ciso.voltageSources.length).toBe(1);
			expect(ciso.voltageSources[0].voltage).toBe(15);
			expect(ciso.voltageSources[0].positiveNode).toBe("n1");
			expect(ciso.voltageSources[0].negativeNode).toBe("n4");
			expect(ciso.voltageSources[0].frequency).toBe(0);
		})

		it("We can add an AC voltage source", function() {
			var ciso = new CiSo();
			ciso.addVoltageSource("ACV1",15,"n1","n4",2000);
			expect(ciso.voltageSources.length).toBe(1);
			expect(ciso.voltageSources[0].voltage).toBe(15);
			expect(ciso.voltageSources[0].positiveNode).toBe("n1");
			expect(ciso.voltageSources[0].negativeNode).toBe("n4");
			expect(ciso.voltageSources[0].frequency).toBe(2000);
		});

		it("Adding a voltage source will set a reference node", function() {
			var ciso = new CiSo();
			expect(ciso.referenceNode).toBe(null);
			ciso.addVoltageSource("ACV1",15,"n1","n4",2000);
			expect(ciso.referenceNode).toBe("n4");
			expect(ciso.referenceNodeIndex).toBe(1);
		});
	});

	describe("Node lists", function() {

		var ciso = new CiSo();
		ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
		ciso.addComponent("C1", "Capacitor", 0.000001, ["n2", "n3"]);
		ciso.addComponent("L1", "Inductor", 0.00002, ["n3", "n4"]);
		ciso.addVoltageSource("ACV1",15,"n1","n4",2000);

		it("We can make a node list", function() {
			expect(ciso.nodes.length).toBe(4);
			expect(ciso.nodes[1]).toBe("n2");
			expect(ciso.nodes[2]).toBe("n3");
		})

		it("We can find the components that are linked to a node", function() {
			var testNode = ciso.nodes[2];
			expect(testNode).toBe("n3");
			expect(ciso.getLinkedComponents(testNode)).toExist();
			expect(ciso.getLinkedComponents(testNode).length).toBe(2);
			expect(ciso.getLinkedComponents(testNode)[1].id).toBe("L1");
		});

		it("We can get the index of nodes", function() {
			expect(ciso.getNodeIndex("n1")).toBe(0)
			expect(ciso.getNodeIndex("n2")).toBe(1)
			expect(ciso.getNodeIndex("n3")).toBe(2)
		});

		it("We can get the index of nodes and skip the reference node", function() {
			var ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
			ciso.addVoltageSource("ACV1",15,"n2","n3",2000);
			ciso.addComponent("C1", "Capacitor", 0.000001, ["n3", "n4"]);
			ciso.addComponent("L1", "Inductor", 0.00002, ["n4", "n1"]);

			expect(ciso.getNodeIndex("n1")).toBe(0)
			expect(ciso.getNodeIndex("n2")).toBe(1)
			expect(ciso.getNodeIndex("n4")).toBe(2)
		});

	});

	describe("Calculating matrices for DC circuits", function() {

		var ciso = new CiSo();
		ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
		ciso.addComponent("R2", "Resistor", 2000, ["n2", "n3"]);
		ciso.addComponent("R3", "Resistor", 1,    ["n3", "n4"]);
		ciso.addVoltageSource("DCV1",15,"n1","n4");

		it("We can compute the diagonal matrix element for a node", function() {
			var testNode = ciso.nodes[0];
			var frequency = ciso.voltageSources[0].frequency;
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(0.0002, 0);
			testNode = ciso.nodes[1];
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(0.0007, 0);
			testNode = ciso.nodes[2];
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(1.0005, 0);
		});

		it("We can compute the off-diagonal matrix element for a component", function() {
			var frequency = ciso.voltageSources[0].frequency;
			var testComponent = ciso.components[0];
			expect(testComponent.getOffDiagonalMatrixElement(frequency)).toBeComplex(-0.0002, 0);
			testComponent = ciso.components[1]
			expect(testComponent.getOffDiagonalMatrixElement(frequency)).toBeComplex(-0.0005, 0);
			testComponent = ciso.components[2]
			expect(testComponent.getOffDiagonalMatrixElement(frequency)).toBeComplex(-1, 0);
		});

		it("We can add the G matrix", function() {
			ciso.createEmptyAMatrix();
			ciso.addGMatrix();
			expect (ciso.AMatrix[0]).toBeComplexArray([[ 0.0002, 0], [-0.0002, 0], [ 0, 0     ]]);
			expect (ciso.AMatrix[1]).toBeComplexArray([[-0.0002, 0], [ 0.0007, 0], [-0.0005, 0]]);
			expect (ciso.AMatrix[2]).toBeComplexArray([[ 0, 0     ], [-0.0005, 0], [ 1.0005, 0]]);
		});

		it("We can add the B and C matrices", function() {
			ciso.addBCMatrix();
			expect (ciso.AMatrix[3][0]).toBeComplex(1, 0);
			expect (ciso.AMatrix[3][1]).toBeComplex(0, 0);
			expect (ciso.AMatrix[3][2]).toBeComplex(0, 0);

			expect (ciso.AMatrix[0][3]).toBeComplex(1, 0);
			expect (ciso.AMatrix[1][3]).toBeComplex(0, 0);
			expect (ciso.AMatrix[2][3]).toBeComplex(0, 0);
		});

		it("We can directly generate the A matrix", function() {
			ciso.createAMatrix();

			expect (ciso.AMatrix[0]).toBeComplexArray([[ 0.0002, 0], [-0.0002, 0], [ 0, 0     ], [ 1, 0 ]]);
			expect (ciso.AMatrix[1]).toBeComplexArray([[-0.0002, 0], [ 0.0007, 0], [-0.0005, 0], [ 0, 0 ]]);
			expect (ciso.AMatrix[2]).toBeComplexArray([[ 0, 0     ], [-0.0005, 0], [ 1.0005, 0], [ 0, 0 ]]);
			expect (ciso.AMatrix[3]).toBeComplexArray([[ 1, 0     ], [ 0, 0     ], [ 0, 0     ], [ 0, 0 ]]);
		});

		it("We can generate the Z matrix", function() {
			ciso.createZMatrix();

			expect (ciso.ZMatrix[0]).toBeComplexArray([[0, 0], [0, 0], [0, 0], [15, 0]]);
		});

		it("We can solve the matrixes", function() {
			var result = ciso.solve();

			expect(result.elements.length).toBe(1);
			expect(result.elements[0].length).toBe(4);

			expect(result.elements[0][0]).toBeComplex(15,0);
			expect(result.elements[0][1]).toBeComplex(4.287,0);
			expect(result.elements[0][2]).toBeComplex(2.142e-3,0);
			expect(result.elements[0][3]).toBeComplex(-2.142e-3,0);
		});
	});

	describe("Solving basic DC circuits", function() {
		it("We can solve a 1-resistor circuit", function() {
			var ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
			ciso.addVoltageSource("DCV1",10,"n1","n2");

			var v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(10);
			var v3 = ciso.getVoltageAt("n2");
			expect(v3.real).toBe(0);

			var i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.002);
		});

		it("We can solve a 2-resistor series circuit", function() {
			var ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 5000, ["n2", "n3"]);
			ciso.addVoltageSource("DCV1",12,"n1","n3");

			var v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(12);
			var v2 = ciso.getVoltageAt("n2");
			expect(v2.real).toBe(6);
			var v3 = ciso.getVoltageAt("n3");
			expect(v3.real).toBe(0);

			var v12 = ciso.getVoltageBetween("n1", "n2");
			expect(v12.real).toBe(6);
			var v13 = ciso.getVoltageBetween("n1", "n3");
			expect(v13.real).toBe(12);

			var i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.0012);

			ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 2000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 1000, ["n2", "n3"]);
			ciso.addVoltageSource("DCV1",12,"n1","n3");

			v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(12);
			v2 = ciso.getVoltageAt("n2");
			expect(v2.real).toBe(4);
			v3 = ciso.getVoltageAt("n3");
			expect(v3.real).toBe(0);
			v12 = ciso.getVoltageBetween("n1", "n2");
			expect(v12.real).toBe(8);
			v13 = ciso.getVoltageBetween("n1", "n3");
			expect(v13.real).toBe(12);
			i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.004);
		});

		it("We can solve a 3-resistor series circuit", function() {
			var ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 2000, ["n2", "n3"]);
			ciso.addComponent("R2", "Resistor", 3000, ["n3", "n4"]);
			ciso.addVoltageSource("DCV1",12,"n1","n4");

			var v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(12);
			var v2 = ciso.getVoltageAt("n2");
			expect(v2.real).toBe(10);
			var v3 = ciso.getVoltageAt("n3");
			expect(v3.real).toBeAbout(6);
			var v3 = ciso.getVoltageAt("n4");
			expect(v3.real).toBe(0);

			var i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.002);
		});

		it("We can solve a 2-resistor parallel circuit", function() {
			var ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 1000, ["n1", "n2"]);
			ciso.addVoltageSource("DCV1",12,"n1","n2");

			var v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(12);
			var v2 = ciso.getVoltageAt("n2");
			expect(v2.real).toBe(0);
			var i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.024);

			ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 3000, ["n1", "n2"]);
			ciso.addVoltageSource("DCV1",12,"n1","n2");

			i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.016);
		});

		it("We can solve a 3-resistor parallel circuit", function() {
			var ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R3", "Resistor", 500, ["n1", "n2"]);
			ciso.addVoltageSource("DCV1",12,"n1","n2");

			var i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.048);
		});

		it("We can solve a 3-resistor series-parallel circuit", function() {
			var ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 1000, ["n2", "n3"]);
			ciso.addComponent("R3", "Resistor", 1000, ["n2", "n3"]);
			ciso.addVoltageSource("DCV1",12,"n1","n3");

			var v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(12);
			var v2 = ciso.getVoltageAt("n2");
			expect(v2.real).toBe(4);
			var i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.008);

			ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R3", "Resistor", 1000, ["n2", "n3"]);
			ciso.addVoltageSource("DCV1",12,"n1","n3");

			v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(12);
			var v2 = ciso.getVoltageAt("n2");
			expect(v2.real).toBe(8);
			i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.008);

			ciso = new CiSo();
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 1000, ["n2", "n3"]);
			ciso.addComponent("R3", "Resistor", 1000, ["n1", "n3"]);
			ciso.addVoltageSource("DCV1",12,"n1","n3");

			v1 = ciso.getVoltageAt("n1");
			expect(v1.real).toBe(12);
			var v2 = ciso.getVoltageAt("n2");
			expect(v2.real).toBeAbout(6);
			i = ciso.getCurrent("DCV1");
			expect(i.real).toBeAbout(-0.018);
		});

		/**
			V1 ───R1──┬───R2────┬──R3────┬──┬──R6─── Gnd
								│					└───R4───┘	│
								│											│
								└────────R5───────────┘
		**/
		it("We can solve a complex 6-resistor series-parallel circuit", function() {
			var ciso = new CiSo();
			// add nodes in arbitrary order
			ciso.addComponent("R4", "Resistor", 1000, ["n3", "n4"]);
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R6", "Resistor", 1000, ["n4", "n5"]);
			ciso.addComponent("R5", "Resistor", 1000, ["n2", "n4"]);
			ciso.addComponent("R2", "Resistor", 1000, ["n2", "n3"]);
			ciso.addComponent("R3", "Resistor", 1000, ["n3", "n4"]);
			ciso.addVoltageSource("DCV1",12,"n1","n5");

			expect( ciso.getVoltageAt("n1").real ).toBe(12);

			expect( ciso.getCurrent("DCV1").real ).toBeAbout(-0.004615);
			expect( ciso.getVoltageAt("n2").real ).toBeAbout(7.385);
			expect( ciso.getVoltageAt("n3").real ).toBeAbout(5.538);
			expect( ciso.getVoltageAt("n4").real ).toBeAbout(4.615);
		});

		/**
				┌──────R4──────┐
				│              │
				├──R1──┬──R3───┤
				│      │       │
				V1     R2      V2
				└──────┴───────┘
		**/
		it("We can solve a 2-voltage circuit", function() {
			var ciso = new CiSo();
			ciso.addVoltageSource("DCV1",12,"n2","n1");
			ciso.addComponent("R1", "Resistor", 3, ["n2", "n3"]);
			ciso.addComponent("R2", "Resistor", 8, ["n3", "n1"]);
			ciso.addComponent("R3", "Resistor", 6, ["n3", "n4"]);
			ciso.addComponent("R4", "Resistor", 4, ["n2", "n4"]);
			ciso.addVoltageSource("DCV2",6,"n1","n4");

			expect( ciso.getVoltageAt("n1").real ).toBe(0);
			expect( ciso.getVoltageAt("n2").real ).toBe(12);
			expect( ciso.getVoltageAt("n3").real ).toBeAbout(4.8);
			expect( ciso.getVoltageAt("n4").real ).toBe(-6);
		});

		/**
				As above
		**/
		it("We can solve a 2-voltage circuit and change the reference node", function() {
			var ciso = new CiSo();
			ciso.addVoltageSource("DCV1",12,"n2","n1");
			ciso.addComponent("R1", "Resistor", 3, ["n2", "n3"]);
			ciso.addComponent("R2", "Resistor", 8, ["n3", "n1"]);
			ciso.addComponent("R3", "Resistor", 6, ["n3", "n4"]);
			ciso.addComponent("R4", "Resistor", 4, ["n2", "n4"]);
			ciso.addVoltageSource("DCV2",6,"n1","n4");

			ciso.setReferenceNode("n2");

			expect( ciso.getVoltageAt("n1").real ).toBeAbout(-12);
			expect( ciso.getVoltageAt("n2").real ).toBe(0);
			expect( ciso.getVoltageAt("n3").real ).toBeAbout(-7.2);
			expect( ciso.getVoltageAt("n4").real ).toBeAbout(-18);
		});

		it("We can use an ohmmeter in a Sparks activity", function() {
			var ciso = new CiSo();
			ciso.addVoltageSource("DCV1",12,"n1","n99");
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 2000, ["n2", "n3"]);
			ciso.addComponent("R2", "Resistor", 3000, ["n3", "n4"]);
			ciso.addVoltageSource("ohmmeterBattery",1,"n1","n2");
			ciso.setReferenceNode("n2");

			expect(ciso.getCurrent("ohmmeterBattery").magnitude).toBeAbout(0.001);

			ciso = new CiSo();
			ciso.addVoltageSource("DCV1",12,"n98","n99");
			ciso.addComponent("R1", "Resistor", 1000, ["n1", "n2"]);
			ciso.addComponent("R2", "Resistor", 2000, ["n2", "n3"]);
			ciso.addComponent("R2", "Resistor", 3000, ["n3", "n4"]);
			ciso.addVoltageSource("ohmmeterBattery",1,"n1","n2");
			ciso.setReferenceNode("n2");

			expect(ciso.getCurrent("ohmmeterBattery").magnitude).toBeAbout(0.001);

		});
	});

	describe("Calculating matrices for AC circuits", function() {

		var ciso = new CiSo();
		ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
		ciso.addComponent("C1", "Capacitor", 0.000001, ["n2", "n3"]);
		ciso.addComponent("L1", "Inductor", 0.00002, ["n3", "n4"]);
		ciso.addVoltageSource("ACV1",15,"n1","n4",2000);

		it("We can compute the diagonal matrix element for a node", function() {
			var testNode = ciso.nodes[0];
			var frequency = ciso.voltageSources[0].frequency;
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(0.0002, 0);
			testNode = ciso.nodes[1];
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(0.0002, 0.0125664);
			testNode = ciso.nodes[2];
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(0, -3.9663);
		});

		it("We can compute the off-diagonal matrix element for a component", function() {
			var frequency = ciso.voltageSources[0].frequency;
			var testComponent = ciso.components[0];
			expect(testComponent.getOffDiagonalMatrixElement(frequency)).toBeComplex(-0.0002, 0);
			testComponent = ciso.components[1]
			expect(testComponent.getOffDiagonalMatrixElement(frequency)).toBeComplex(0, -0.012566);
		});

		it("We can add the G matrix", function() {
			ciso.createEmptyAMatrix();
			ciso.addGMatrix();
			expect (ciso.AMatrix[0]).toBeComplexArray([[ 0.0002, 0], [-0.0002, 0       ], [0, 0       ]]);
			expect (ciso.AMatrix[1]).toBeComplexArray([[-0.0002, 0], [ 0.0002, 0.01257], [0, -0.012566]]);
			expect (ciso.AMatrix[2]).toBeComplexArray([[ 0, 0     ], [ 0, -0.012566     ], [0, -3.9663]]);
		});
	});

  describe("Solving basic AC circuits", function() {
    it("We can solve a 2-cap series circuit", function() {
      var ciso = new CiSo();
      ciso.addComponent("C1", "Capacitor", 0.000001, ["n1", "n2"]);
      ciso.addComponent("C2", "Capacitor", 0.000001, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",12,"n1","n3",1000);

      expect( ciso.getVoltageAt("n1") ).toBeComplex(12,0);
      expect( ciso.getVoltageAt("n2") ).toBeComplex(6,0);
      expect( ciso.getVoltageAt("n3") ).toBeComplex(0,0);
    });

    it("We can solve a 2-ind series circuit", function() {
      var ciso = new CiSo();
      ciso.addComponent("L1", "Inductor", 0.000001, ["n1", "n2"]);
      ciso.addComponent("L2", "Inductor", 0.000001, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",12,"n1","n3",1000);

      expect( ciso.getVoltageAt("n1") ).toBeComplex(12,0);
      expect( ciso.getVoltageAt("n2") ).toBeComplex(6,0);
      expect( ciso.getVoltageAt("n3") ).toBeComplex(0,0);
    });

    it("We can solve an rc series circuit", function() {
      var ciso = new CiSo();
      ciso.addComponent("R1", "Resistor", 100, ["n1", "n2"]);
      ciso.addComponent("C1", "Capacitor", 1e-6, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",10,"n1","n3",1000);

      expect( ciso.getVoltageAt("n1") ).toBeComplex(10,0);
      expect( ciso.getVoltageAt("n2") ).toBeComplex(7.170, -4.505);
      expect( ciso.getVoltageAt("n3") ).toBeComplex(0,0);

      ciso = new CiSo();
      ciso.addComponent("R1", "Resistor", 100, ["n1", "n2"]);
      ciso.addComponent("C1", "Capacitor", 1e-6, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",10,"n1","n3",10000);

      expect( ciso.getVoltageAt("n2") ).toBeComplex(0.247, -1.552);
    });

    it("We can solve an rl series circuit", function() {
      var ciso = new CiSo();
      ciso.addComponent("R1", "Resistor", 100, ["n1", "n2"]);
      ciso.addComponent("L1", "Inductor", 0.001, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",10,"n1","n3",1000);

      expect( ciso.getVoltageAt("n1") ).toBeComplex(10,0);
      expect( ciso.getVoltageAt("n2") ).toBeComplex(0.0393, 0.626);
      expect( ciso.getVoltageAt("n3") ).toBeComplex(0,0);

      ciso = new CiSo();
      ciso.addComponent("R1", "Resistor", 100, ["n1", "n2"]);
      ciso.addComponent("L1", "Inductor", 0.001, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",10,"n1","n3",10000);

      expect( ciso.getVoltageAt("n2") ).toBeComplex(2.83, 4.505);
    });

    it("We can solve a cl series circuit", function() {
      var ciso = new CiSo();
      ciso.addComponent("C1", "Capacitor", 1e-6, ["n1", "n2"]);
      ciso.addComponent("L1", "Inductor", 0.001, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",10,"n1","n3",1000);

      expect( ciso.getVoltageAt("n1") ).toBeComplex(10,0);
      expect( ciso.getVoltageAt("n2") ).toBeComplex(-0.411, 0);
      expect( ciso.getVoltageAt("n3") ).toBeComplex(0,0);

      ciso = new CiSo();
      ciso.addComponent("C1", "Capacitor", 1e-6, ["n1", "n2"]);
      ciso.addComponent("L1", "Inductor", 0.001, ["n2", "n3"]);
      ciso.addVoltageSource("ACV1",10,"n1","n3",10000);

      expect( ciso.getVoltageAt("n2") ).toBeComplex(13.392, 0);
    });

    it("We can solve an rcl series circuit", function() {
      var ciso = new CiSo();
      ciso.addComponent("R1", "Resistor", 100, ["n1", "n2"]);
      ciso.addComponent("C1", "Capacitor", 1e-6, ["n2", "n3"]);
      ciso.addComponent("L1", "Inductor", 0.001, ["n3", "n4"]);
      ciso.addVoltageSource("ACV1",10,"n1","n4",1000);

      expect( ciso.getVoltageAt("n1") ).toBeComplex(10,0);
      expect( ciso.getVoltageAt("n2") ).toBeComplex(7.003,-4.5811);
      expect( ciso.getVoltageAt("n3") ).toBeComplex(-0.2878,0.1883);
    });
  });
});

