describe("The matrix library", function() {

	var C = $Comp

	it("Can multiply two matrices together", function() {
		var aM = $M([[C(1,0),C(2,1),C(3,2)],[C(2,0),C(3,1),C(4,2)],[C(3,0),C(4,1),C(5,2)]]),
				bM = $M([[C(1,0),C(2,1)],[C(2,0),C(3,1)],[C(3,0),C(4,1)]]),
				cM = aM.x(bM),
				res = cM.elements;

				expect(res[0]).toBeComplexArray([[14, 8],[17,17]]);
				expect(res[1]).toBeComplexArray([[20, 8],[26,20]]);
				expect(res[2]).toBeComplexArray([[26, 8],[35,23]]);
	});

	it("Can get the inverse of a matrix", function() {
		var aM = $M([[C(0,0),C(2,1),C(3,2)],[C(2,0),C(3,1),C(4,2)],[C(3,0),C(4,1),C(5,2)]]),
				iM = aM.inv(),
				res = iM.elements;

				expect(res[0]).toBeComplexArray([[-1, 0],[2, 0],     [-1, 0]]);
				expect(res[1]).toBeComplexArray([[ 2, 0],[-7.5, 1.5],[5, -1]]);
				expect(res[2]).toBeComplexArray([[-1, 0],[4.5, -1.5],[-3, 1]]);
	});

	it("Can multiply a matrix by its inverse to get I", function() {
		var aM = $M([[C(0,0),C(2,1),C(3,2)],[C(2,0),C(3,1),C(4,2)],[C(3,0),C(4,1),C(5,2)]]),
				iM = aM.inv(),
				bM = aM.x(iM),
				res = bM.elements;

				expect(res[0]).toBeComplexArray([[1, 0],[0, 0],[0, 0]]);
				expect(res[1]).toBeComplexArray([[0, 0],[1, 0],[0, 0]]);
				expect(res[2]).toBeComplexArray([[0, 0],[0, 0],[1, 0]]);
	});

});