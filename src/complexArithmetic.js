
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

