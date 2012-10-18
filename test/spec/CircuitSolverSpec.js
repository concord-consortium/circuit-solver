describe("CircuitSolver", function() {

  it("We can add a component", function() {
    addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
    numComponents = components.length;
    firstComponentLabel = components[0].label;
    firstComponentType = components[0].type;
    firstComponentValue = components[0].value;
    firstComponentNodes = components[0].nodeLabels;
    expect(numComponents).toBe(1);
    expect(firstComponentLabel).toBe("R1");
    expect(firstComponentType).toBe("Resistor");
    expect(firstComponentValue).toBe(5000);
    expect(firstComponentNodes[0]).toBe("n1");
    expect(firstComponentNodes[1]).toBe("n2");
  })


 it("We can add a second component", function() {
    addComponent("C1", "Capacitor", 0.000001, ["n2", "n3"]);
    numComponents = components.length;
    secondComponentLabel = components[1].label;
    secondComponentType = components[1].type;
    secondComponentValue = components[1].value;
    secondComponentNodes = components[1].nodeLabels;
    expect(numComponents).toBe(2);
    expect(secondComponentLabel).toBe("C1");
    expect(secondComponentType).toBe("Capacitor");
    expect(secondComponentValue).toBe(0.000001);
    expect(secondComponentNodes[0]).toBe("n2");
    expect(secondComponentNodes[1]).toBe("n3");
  })

  it("We can add a third component", function() {
    addComponent("L1", "Inductor", 0.00002, ["n3", "n4"]);
    numComponents = components.length;
    thirdComponentLabel = components[2].label;
    thirdComponentType = components[2].type;
    thirdComponentValue = components[2].value;
    thirdComponentNodes = components[2].nodeLabels;
    expect(numComponents).toBe(3);
    expect(thirdComponentLabel).toBe("L1");
    expect(thirdComponentType).toBe("Inductor");
    expect(thirdComponentValue).toBe(0.00002);
    expect(thirdComponentNodes[0]).toBe("n3");
    expect(thirdComponentNodes[1]).toBe("n4");
  })

 it("We can add an AC voltage source", function() {
    addACVoltageSource("ACV1",15,"n1","n4",2000);
    expect(acVoltageSources.length).toBe(1);
    expect(acVoltageSources[0].voltage).toBe(15);
    expect(acVoltageSources[0].groundNodeLabel).toBe("n1");
    expect(acVoltageSources[0].voltageNodeLabel).toBe("n4");
    expect(acVoltageSources[0].frequency).toBe(2000);
  })

it("We can make a node list", function() {
     makeNodeList();
     expect(circuitNodes.length).toBe(4);
     expect(circuitNodeLabels[1]).toBe("n2");
     expect(circuitNodeLabels[2]).toBe("n3");
  })

it("We can find the components that are linked to a node", function() {
    var testNode = circuitNodes[2];
    expect(testNode.label).toBe("n3");
    expect(testNode.getLinkedComponents()).toExist();
    expect(testNode.getLinkedComponents().length).toBe(2);
    expect(testNode.getLinkedComponents()[0].label).toBe("L1");
})

it("We can compute the complex impedance of a component", function() {
    var testComponent0 = components[0];
    var testComponent1 = components[1];
    var testComponent2 = components[2];
    var frequency = acVoltageSources[0].frequency;
    expect(testComponent0.getImpedance(frequency).real).toBe(5000);
    expect(testComponent0.getImpedance(frequency).imag).toBe(0);
    expect(testComponent1.getImpedance(frequency).real).toBe(0);
    expect(testComponent1.getImpedance(frequency).imag).toBeCloseTo(1/(twoPi*frequency*testComponent1.value));
    expect(testComponent2.getImpedance(frequency).real).toBe(0);
    expect(testComponent2.getImpedance(frequency).imag).toBeCloseTo(0.251);
})

it("We can compute the diagonal matrix element for a node", function() {
    var testNode = circuitNodes[1];
    var frequency = acVoltageSources[0].frequency;
    expect(testNode.getDiagonalMatrixElement(frequency).real).toBeCloseTo(0.0002);
    expect(testNode.getDiagonalMatrixElement(frequency).imag).toBeCloseTo(-0.0125664);
    testNode = circuitNodes[2];
    expect(testNode.getDiagonalMatrixElement(frequency).real).toBeCloseTo(0);
    expect(testNode.getDiagonalMatrixElement(frequency).imag).toBeCloseTo(-3.9914);
})

it("We can compute the off-diagonal matrix element for a component", function() {
    var frequency = acVoltageSources[0].frequency;
    var testComponent = components[0];
    expect(testComponent.getOffDiagonalMatrixElement(frequency).real).toBeCloseTo(0.0002);
    expect(testComponent.getOffDiagonalMatrixElement(frequency).imag).toBeCloseTo(0);
    testComponent = components[1]
    expect(testComponent.getOffDiagonalMatrixElement(frequency).real).toBeCloseTo(0);
    expect(testComponent.getOffDiagonalMatrixElement(frequency).imag).toBeCloseTo(-0.0125664);
})

it("We can fill the G matrix", function() {
    fillGMatrix();
    expect (gMatrix[0][0].real).toBe(1/5000);
    expect (gMatrix[0][0].imag).toBe(0);
    expect (gMatrix[0][1].real).toBe(.0002);
    expect (gMatrix[0][1].imag).toBe(0);
    expect (gMatrix[1][1].real).toBe(.0002);
    expect (gMatrix[1][1].imag).toBeCloseTo(-0.0125664);

})

it("We can augment the G matrix", function() {
    augmentGMatrix();
    expect (gMatrix[4][0].real).toBe(0);
    expect (gMatrix[4][0].imag).toBe(0);
    expect (gMatrix[4][3].real).toBe(1);
    expect (gMatrix[4][3].imag).toBe(0);
    expect (gMatrix[3][4].real).toBe(1);
    expect (gMatrix[3][4].imag).toBe(0);
    expect (gMatrix[4][4].real).toBe(0);
    expect (gMatrix[4][4].imag).toBe(0);
})

})

