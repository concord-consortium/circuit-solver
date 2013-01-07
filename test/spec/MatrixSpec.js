describe("The matrix library (real numbers only)", function() {

	it("Can multiply two matrices together", function() {
		var aM = $M([[1,2,3],[2,3,4],[3,4,5]]),
				bM = $M([[1,2],[2,3],[3,4]]),
				cM = aM.x(bM),
				res = cM.elements;

				expect(res[0]).toBeArray([14,20]);
				expect(res[1]).toBeArray([20,29]);
				expect(res[2]).toBeArray([26,38]);
	});

	it("Can get the inverse of a matrix", function() {
		var aM = $M([[0,2,3],[2,3,4],[3,4,5]]),
				iM = aM.inv(),
				res = iM.elements;

				expect(res[0]).toBeArray([-1, 2,-1]);
				expect(res[1]).toBeArray([ 2,-9, 6]);
				expect(res[2]).toBeArray([-1, 6,-4]);
	});

	it("Can multiply a matrix by its inverse to get I", function() {
		var aM = $M([[0,2,3],[2,3,4],[3,4,5]]),
				iM = aM.inv(),
				bM = aM.x(iM),
				res = bM.elements;

				expect(res[0]).toBeArray([1, 0, 0]);
				expect(res[1]).toBeArray([0, 1, 0]);
				expect(res[2]).toBeArray([0, 0, 1]);
	});

});