describe("CircuitSolver", function() {

	describe("Adding components", function() {

		var ciso = new CiSo();

		it("We can add a component", function() {
			ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
			numComponents = ciso.components.length;
			firstComponentLabel = ciso.components[0].label;
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
			secondComponentLabel = ciso.components[1].label;
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
			thirdComponentLabel = ciso.components[2].label;
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
			expect(testComponent1.getImpedance(frequency)).toBeComplex(0, 1/(2*Math.PI*frequency*testComponent1.value));
			expect(testComponent2.getImpedance(frequency)).toBeComplex(0, 0.251);
		});

	});

	describe("Adding voltage sources", function() {
		it("We can add an AC voltage source", function() {
			var ciso = new CiSo();
			ciso.addACVoltageSource("ACV1",15,"n1","n4",2000);
			expect(ciso.acVoltageSources.length).toBe(1);
			expect(ciso.acVoltageSources[0].voltage).toBe(15);
			expect(ciso.acVoltageSources[0].groundNodeLabel).toBe("n1");
			expect(ciso.acVoltageSources[0].voltageNodeLabel).toBe("n4");
			expect(ciso.acVoltageSources[0].frequency).toBe(2000);
		})
	});

	describe("Node lists", function() {

		var ciso = new CiSo();
		ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
		ciso.addComponent("C1", "Capacitor", 0.000001, ["n2", "n3"]);
		ciso.addComponent("L1", "Inductor", 0.00002, ["n3", "n4"]);
		ciso.addACVoltageSource("ACV1",15,"n1","n4",2000);

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
			expect(ciso.getLinkedComponents(testNode)[1].label).toBe("L1");
		});

	});

	describe("Calculating matrices", function() {

		var ciso = new CiSo();
		ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
		ciso.addComponent("C1", "Capacitor", 0.000001, ["n2", "n3"]);
		ciso.addComponent("L1", "Inductor", 0.00002, ["n3", "n4"]);
		ciso.addACVoltageSource("ACV1",15,"n1","n4",2000);

		it("We can compute the diagonal matrix element for a node", function() {
			var testNode = ciso.nodes[1];
			var frequency = ciso.acVoltageSources[0].frequency;
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(0.0002, -0.0125664);
			testNode = ciso.nodes[2];
			expect(ciso.getDiagonalMatrixElement(testNode, frequency)).toBeComplex(0, -3.9914);
		});

		it("We can compute the off-diagonal matrix element for a component", function() {
			var frequency = ciso.acVoltageSources[0].frequency;
			var testComponent = ciso.components[0];
			expect(testComponent.getOffDiagonalMatrixElement(frequency)).toBeComplex(0.0002, 0);
			testComponent = ciso.components[1]
			expect(testComponent.getOffDiagonalMatrixElement(frequency)).toBeComplex(0, -0.0125664);
		});

		it("We can fill the G matrix", function() {
			ciso.fillGMatrix();
			expect (ciso.gMatrix[0]).toBeComplexArray([[.0002, 0], [.0002, 0        ], [0, 0       ]]);
			expect (ciso.gMatrix[1]).toBeComplexArray([[.0002, 0], [.0002, -0.012567], [0, -0.01257]]);
		});

		it("We can augment the G matrix", function() {
			ciso.augmentGMatrix();
			expect (ciso.gMatrix[4][0]).toBeComplex(0, 0);
			expect (ciso.gMatrix[4][3]).toBeComplex(1, 0);
			expect (ciso.gMatrix[3][4]).toBeComplex(1, 0);
			expect (ciso.gMatrix[4][4]).toBeComplex(0, 0);
		});
	});

});

