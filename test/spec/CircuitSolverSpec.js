describe("CircuitSolver", function () {

    it("We can solve a complex diode-resistor-capacitor wheatstone bridge circuit", function () {
          var ciso = new CiSo();
          // add nodes in arbitrary order
          //ciso.addComponent("R1", "Resistor", 1000, ["n1", "n3"]);
          ciso.addComponent("R2", "Resistor", 1000, ["n1", "n6"]);
          //ciso.addComponent("R3", "Resistor", 1000, ["n2", "n3"]);

          //ciso.addComponent("D1", "Diode", 1000, ["n3", "n4"], 0.00001, 10000, true);

          ciso.addComponent("T1", "MOSFET", 2000, ["n6", "n5", "n2"], 0.00001, 10000, true);

          ciso.addVoltageSource("DCV1", 2, "n1", "n2", 0);
          ciso.addVoltageSource("ACV2", 0, "n5", "n2", -1000, [4,12,4, 8, 6, 9, 10, -8, -2.5, 4, -6]);
  
          //expect(ciso.getVoltageAt("n1", 0).real).toBe(12);

          //alert("Voltage between two ends of the diode is " + ciso.getVoltageBetween("n5", "n4", 0));
          //alert("Voltage between two ends of the diode is " + ciso.getVoltageBetween("n5", "n2", 0));

  
          alert("Current through ACV2 is " + ciso.getCurrent("ACV2", 0).real);
          //alert("Current through ACV1 (opposite phase) is " + ciso.getCurrent("ACV1", 0.0005).real);
          //alert("Current through ACV1 (same phase) is " + ciso.getCurrent("ACV1", 0.001).real);


          //expect(ciso.getVoltageAt("n2", 0).real).toBe(0);
          //alert("Brace yourselves");
          //expect(ciso.getVoltageAt("n3", 0).real);
          //alert("Voltage at n3 is " + ciso.getVoltageAt("n3", 0).real)
          //alert("Voltage at n3 (opposite phase) is " + ciso.getVoltageAt("n3", 0.0005).real)
          //alert("Voltage at n4 is " + ciso.getVoltageAt("n3", 0).real);
          //alert("Voltage at n4 (opposite phase) is " + ciso.getVoltageAt("n3", 0.0005).real)

          var t;
          var tt = 0.05;
          //var voltage_3 = new Array();
          //var voltage_4 = new Array();
          var voltage_3_string = "";
          var voltage_4_string = "";
          var voltage_string = "";

          var current_collector_emitter = "";
          var current_base_emitter = "";


          for (t = 0; t<=tt; t = t+0.0001) {
              //voltage_3[100000*t] = ciso.getVoltageAt("n3", t).real;
              //voltage_4[100000 * t] = ciso.getVoltageAt("n3", t).real;
              voltage_3_string = voltage_3_string + " " + ciso.getVoltageBetween("n5", "n2", t).real;
              voltage_4_string = voltage_4_string + " " + ciso.getVoltageBetween("n6", "n2", t).real;
              //voltage_string = voltage_string + " " + ciso.getVoltageBetween("n5", "n2", t).real;
              //current_collector_emitter = current_collector_emitter + " " + ciso.getCurrent("ACV3", t).real;
              //current_base_emitter = current_base_emitter + " " + ciso.getCurrent("ACV2", t).real;

          }

          alert(voltage_3_string);
          alert(voltage_4_string);
          //alert(voltage_string);
            
          //alert("Voltage at n5 is " + ciso.getVoltageAt("n5", 0).real);
          //alert("Voltage at n5 (opposite phase) is " + ciso.getVoltageAt("n5", 0.0005).real)
          //alert("Voltage at n6 is " + ciso.getVoltageAt("n6", 0).real);
          //alert("Voltage at n6 (opposite phase) is " + ciso.getVoltageAt("n6", 0.0005).real)

      }); 

    /*it("We can solve a diode-resistor series circuit", function () {
        var ciso = new CiSo();
        ciso.addComponent("R1", "Resistor", 5000, ["n1", "n2"]);
        ciso.addComponent("D1", "Diode", 5000, ["n3", "n2"], 0.00001, 10000, true);
        ciso.addVoltageSource("DCV1", 12, "n3", "n1");

        var v1 = ciso.getVoltageAt("n1", 0);
        alert("Voltage at n1 is " + v1.real);
        var v2 = ciso.getVoltageAt("n2", 0);
        alert("Voltage at n2 is " + v2.real);
        var v3 = ciso.getVoltageAt("n3", 0);
        expect(v3.real).toBe(12);

        var i = ciso.getCurrent("DCV1");
        alert("Current through voltage source  is " + i.real);
    });*/
});