beforeEach(function() {
  this.addMatchers({
    toExist: function() {
      var obj = this.actual;
      return typeof obj !== "undefined" && obj !== null;
    },
    toBeEmpty: function() {
      var arr = this.actual;
      return arr.length === 0;
    },
    toBeBetween: function(min, max) {
      var num = this.actual;
      return num >= min && num <= max;
    },
    toBeAnyOneOf: function(arr) {
      var act = this.actual;
      return ~arr.indexOf(act);
    },
    toContainAnyOneOf: function(arr) {
      var actArr = this.actual;
      var contains = false;
      for (var i=0, ii=actArr.length; i<ii; i++) {
        if (~arr.indexOf(actArr[i]))
          contains = true;
      }
      return contains;
    },
    toBeAbout: function(val) {
      function toSigFigs (num, sigFigs) {
        num = num.toPrecision(sigFigs);
        return sigFigs > Math.log(num) * Math.LOG10E ? num : ""+parseFloat(num);
      }
      return toSigFigs(this.actual, 3) === toSigFigs(val, 3)
    },
    toBeArray: function(arr) {
      var act = this.actual;
      for (var i=0; i<arr.length; i++) {
        if (arr[i] !== act[i]) {
          return false;
        }
      }
      return true;
    },
    toBeComplex: function(real, imag) {
      var act = this.actual;

      if (!act || typeof act.real !== "number" || typeof act.imag !== "number") {
        return false;
      }

      function toSigFigs (num, sigFigs) {
        num = num.toPrecision(sigFigs);
        return sigFigs > Math.log(num) * Math.LOG10E ? num : ""+parseFloat(num);
      }

      return (toSigFigs(act.real, 3) === toSigFigs(real, 3)) && (toSigFigs(act.imag, 3) === toSigFigs(imag, 3));
    },
    // checks an array of complexes against an equivalent array specified as [[r1,i1],[r2,i2],...]
    toBeComplexArray: function (arr) {
      var act = this.actual;
      function nearlyEqual (num1, num2) {
        return Math.abs(num1-num2) < 1e-3;
      }

      this.message = function() {
        var arrString = "[";
        for (var i=0; i<arr.length; i++) {
          arrString += arr[i][0] + "i" + arr[i][1]+",";
        }
        arrString = arrString.match(/.*[^,]/)[0] + "]";
        return "Expected ["+act.toString()+"] to be "+arrString};

      for (var i=0; i<arr.length; i++) {
        var compare = arr[i];
        var actual = act[i];
        if (!actual) {
          return false;
        }
        if (!nearlyEqual(actual.real, compare[0]) || !nearlyEqual(actual.imag, compare[1])) {
          return false;
        }
      }
      return true;
    }
  });
});
