

describe("CircuitSolver", function () {

  var ciso = null;

    it("We can solve an RC circuit with 1E-5 capacitance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("C1", "Capacitor", 1E-5, ["n3", "n2"]);

        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent((1/(100*1E-5))/(1/(100*1E-5) + 100));

      }); 

    it("We can solve an RC circuit with 1E-4 capacitance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("C1", "Capacitor", 1E-4, ["n3", "n2"]);
     
        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent((1/(100*1E-4))/(1/(100*1E-4) + 100));

      }); 

    it("We can solve an RC circuit with 1E-3 capacitance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("C1", "Capacitor", 1E-3, ["n3", "n2"]);
     
        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent((1/(100*1E-3))/(1/(100*1E-3) + 100));

      }); 

    it("We can solve an RC circuit with 1E-2 capacitance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("C1", "Capacitor", 1E-2, ["n3", "n2"]);

        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent((1/(100*1E-2))/(1/(100*1E-2) + 100));

      }); 

    it("We can solve an RL circuit with 0.1 inductance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("L1", "Inductor", 0.1, ["n3", "n2"]);

        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent(((100*0.1))/((100*0.1) + 100));

      }); 

    it("We can solve an RL circuit with 1 inductance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("L1", "Inductor", 1, ["n3", "n2"]);

        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent(((100*1))/((100*1) + 100));

      });

    it("We can solve an RL circuit with 10 inductance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("L1", "Inductor", 10, ["n3", "n2"]);

        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent(((100*10))/((100*10) + 100));

      }); 

    it("We can solve an RL circuit with 100 inductance", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 1, "n1", "n2", 100);

          ciso.addComponent("R1", "Resistor", 100, ["n1", "n3"]);
          ciso.addComponent("L1", "Inductor", 100, ["n3", "n2"]);

          var voltage1_array = ciso.getVoltageAt_array("n3", 0.1);
          var voltage_ss_array = [];
          var input_array = ciso.getVoltageAt_array("n1", 0.1);
          var current = null;

        
          var i = 0;
          while (i < voltage1_array.length) {

              if (i >= 0.5 * voltage1_array.length)
                voltage_ss_array.push(Math.abs(voltage1_array[i]));
              i = i + 100;
          }

          var voltage_max = Math.max.apply(Math, voltage_ss_array);
          expect(voltage_max).toBeWithin25percent(((100*100))/((100*100) + 100));

      });  

    it("We can solve a bridge full-wave rectifier circuit", function () {
        ciso = new CiSo();
          ciso.addVoltageSource("ACV1", 10, "n1", "n2", 1000);

          ciso.addComponent("D1", "Diode", 10, ["n1", "n3"], 1E-5, 100000);
          ciso.addComponent("D2", "Diode", 10, ["n4", "n2"], 1E-5, 100000);
          ciso.addComponent("D3", "Diode", 10, ["n4", "n1"], 1E-5, 100000);
          ciso.addComponent("D4", "Diode", 10, ["n2", "n3"], 1E-5, 100000);
          ciso.addComponent("R1", "Resistor", 1000, ["n4", "n3"]);
     
        
          var voltage1_array = ciso.getVoltageAt_array("n3", 0.01);
          var voltage2_array = ciso.getVoltageAt_array("n4", 0.01);
          var input_array = ciso.getVoltageAt_array("n1", 0.01);

        
          var i = 0;
          while (i < voltage1_array.length) {

              expect ((voltage1_array[i] - voltage2_array[i])).toBeAbout(Math.abs(input_array[i]));

              i = i + 10;
          }
      
      }); 

});