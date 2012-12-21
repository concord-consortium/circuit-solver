
var Complex = function(real, imag) {
	if (!(this instanceof Complex)) {
		return new Complex (real, imag);
	}

	if (typeof real === "string" && imag === null) {
		return Complex.parse (real);
	}

	this.real = Number(real) || 0;
	this.imag = Number(imag) || 0;
};

Complex.parse = function(string) {
	var real, imag, regex, match, a, b, c;

	// TODO: Make this work better-er
	regex = /^([-+]?(?:\d+|\d*\.\d+))?[-+]?(\d+|\d*\.\d+)?[ij]$/i;
	string = String(string).replace (/\s+/g, '');

	match = string.match (regex);
	if (!match) {
		throw new Error("Invalid input to Complex.parse, expecting a + bi format");
	}

	a = match[1];
	b = match[2];
	c = match[3];

	real = a !== null ? parseFloat (a) : 0;
	imag = parseFloat ((b || "+") + (c || "1"));

	return new Complex(real, imag);
};

Complex.prototype.copy = function() {
	return new Complex (this.real, this.imag);
};

Complex.prototype.add = function(operand) {
	var real, imag;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}
	return new Complex(this.real + real, this.imag + imag);
};

Complex.prototype.subtract = function(operand) {
	var real, imag;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}
	return new Complex(this.real - real, this.imag - imag);
};

Complex.prototype.multiply = function(operand) {
	var real, imag, newReal, newImag;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}

	newReal = this.real * real - this.imag * imag;
	newImag = this.real * imag + this.imag * real

	return new Complex(newReal, newImag);
};

Complex.prototype.divide = function(operand) {
	var real, imag, denom, newReal, newImag;

	if (operand instanceof Complex) {
		real = operand.real;
		imag = operand.imag;
	} else {
		real = Number(operand);
		imag = 0;
	}

	denom = real * real + imag * imag;
	newReal = (this.real * real + this.imag * imag) / denom;
	newImag = (this.imag * real - this.real * imag) / denom;

	return new Complex(newReal, newImag);
};

Complex.prototype.inverse = function() {
	var one = new Complex (1,0);
	return one.divide(this);
};

Complex.prototype.negative = function() {
	var zero = new Complex (0,0);
	return zero.subtract(this);
};

Complex.prototype.toString = function() {
	return this.real + "i" + this.imag;
};