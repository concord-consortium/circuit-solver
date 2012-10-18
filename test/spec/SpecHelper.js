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
    }
  });
});
