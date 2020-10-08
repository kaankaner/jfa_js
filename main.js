/*
    Author: Kaan Kaner
*/

var INVALID_COORD = -1;


var LEFT_MOUSE_THICK = 3;
var RIGHT_MOUSE_THICK = 1;

var ctx0, ctx2;
var imageChanged = true;

var correctRect = function(imgData, rw, rh, w) {
	var data = imgData.data;
	for(var r = 0; r < rh; r++) 
	for(var c = 0; c < rw; c++) {
		var pInd = r * rw + c;
		var byteInd = pInd * 4;
		var re = data[byteInd + 0];
		var gr = data[byteInd + 1];
		var bl = data[byteInd + 2];
		var al = data[byteInd + 3];
		var isMarked = al > 127;
		if (isMarked) {
			data[byteInd + 0] = re;
			data[byteInd + 1] = gr;
			data[byteInd + 2] = bl;
			data[byteInd + 3] = 255;
		} else {
			data[byteInd + 0] = 255;
			data[byteInd + 1] = 255;
			data[byteInd + 2] = 255;
			data[byteInd + 3] = 0;
		}
	}
};

var applyDummy = function(ctx, ctxdummy, bounds) {
	var rw = bounds.x1 - bounds.x0;
	var rh = bounds.y1 - bounds.y0;
	var imgdata = ctxdummy.getImageData(0, 0, rw, rh);
	var data = imgdata.data;
	correctRect(imgdata, rw, rh, ctx.w);
	ctxdummy.putImageData(imgdata, 0, 0); 
	ctx.drawImage(ctxdummy.canvas, bounds.x0, bounds.y0);
};

var randomColor = function() {
	var re = Math.floor(Math.random() * 255);
	var gr = Math.floor(Math.random() * 255);
	var bl = Math.floor(Math.random() * 255);	
	var minValue = 100;
	if (re < minValue) re = minValue;
	if (gr < minValue) gr = minValue;
	if (bl < minValue) bl = minValue;
	return "rgb("+re+","+gr+"," +bl+" )";
};


var drawSegment = function(ctxreal, ctxdummy, x0, y0, x1, y1, col, thick)
{
	var w = ctxreal.w, h = ctxreal.h;

	var ctx = ctxdummy ? ctxdummy : ctxreal;

	

	var bounds;
	if (ctxdummy) {
		bounds = {
			x0: Math.max(Math.floor(Math.min(x0, x1)-thick), 0),
			y0: Math.max(Math.floor(Math.min(y0, y1)-thick), 0),
			x1: Math.max(Math.ceil(Math.max(x0, x1)+thick), ctxdummy.w),
			y1: Math.max(Math.ceil(Math.max(y0, y1)+thick), ctxdummy.h)
		};
		ctx.clearRect(0, 0, bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
	} else {
		bounds = {
			x0: x0,
			y0: y0,
			x1: x1,
			y1: y1
		}
	}

	// Draw a line
	ctx.strokeStyle = col;
	ctx.beginPath();
	ctx.lineWidth = thick;
	ctx.moveTo(x0 - bounds.x0, y0 - bounds.y0);
	ctx.lineTo(x1 - bounds.x0, y1 - bounds.y0);
	ctx.stroke();

	// Cap with a circle.
	ctx.fillStyle = col;
	ctx.beginPath();
	ctx.moveTo(x1-bounds.x0, y1-bounds.y0);
	ctx.arc(x1-bounds.x0, y1-bounds.y0, thick/2, 0, Math.PI * 2);
	ctx.closePath();
	ctx.fill();

	//ctx.fillRect(x0 - bounds.x0, y0 - bounds.y0, x1-x0, y1-y0);

	if (ctxdummy) {
		applyDummy(ctxreal, ctxdummy, bounds);
	}
};


var copy_image_to_array = function(w, h, imgData, arr)
{
	var data = imgData.data;

	for(var r = 0; r < h; r++) {
		for(var c = 0; c < w; c++) {
			var pInd = w * r + c;
			var al = data[pInd * 4 + 3];
			var isMarked = al > 127;
			var tInd = pInd * 2;
			if (isMarked) {
				arr[tInd++] = c;
				arr[tInd  ] = r;
			} else {
				arr[tInd++] = INVALID_COORD;
				arr[tInd  ] = INVALID_COORD;
			}
		}
	}

};

var find_best = function(src, d, c, r, W, H)
{
	var bestdsq = 1e20;
	var bestx = INVALID_COORD, besty = INVALID_COORD;

	var yilast = r + d, 	xilast = c + d;
	for(var yi = r - d; yi <= yilast; yi += d) {
		if (yi < 0 || yi >= H) 
			continue;

		for(var xi = c - d; xi <= xilast; xi += d) {
			if (xi < 0 || xi >= W) 
				continue;

			var byteInd = (yi * W + xi) * 2;
			
			var px = src[byteInd++];
			var py = src[byteInd  ];
			if (px < INVALID_COORD + 0.1 || py < INVALID_COORD + 0.1)
				continue;

			var dx = px - c;
			var dy = py - r;
			var dsq = dx * dx + dy * dy;			
			if (dsq < bestdsq) {
				bestdsq = dsq;
				bestx = px;
				besty = py;
			}
		}
	}

	return {x:bestx, y:besty};

};

var jfa_pass = function(src, dst, W, H, d)
{
	var byteInd = 0;
	for(var r = 0; r < H; r++) {
		for(var c = 0; c < W; c++) {
			var bestxy = find_best(src, d, c, r, W, H);
			//var pInd = r * W + c;
			//var byteInd = pInd * 2;
			dst[byteInd++] = bestxy.x;
			dst[byteInd++] = bestxy.y;
		}
	}
};

var calcd0_simple = function(sz)
{
	if (sz <= 0) throw "";
	if (!Number.isInteger(sz)) throw "";

	var log2 = Math.log(sz) / Math.log(2.0);
	log2 = Math.ceil(log2) - 1;
	var result = Math.pow(2, log2);
	return Math.floor(result);
}


var calcd0_optimized = function(x) {
	if (x <= 0) throw "";
	if (x === 1) return 0;
	if (!Number.isInteger(x)) throw "";

	x--;
	x >>>= 1;

	x |= x >>> 1;
	x |= x >>> 2;
	x |= x >>> 4;
	x |= x >>> 8;
	x |= x >>> 16;

	x++;

	return x;
}


var apply_jfa = function(pages, W, H)
{
	var sz = Math.max(W, H);

	var d0 = calcd0_optimized(sz);

	for(var d = d0; d >= 1; d /= 2) {
		jfa_pass(pages[0], pages[1], W, H, d);		
		var temp = pages[0];
		pages[0] = pages[1];
		pages[1] = temp;
	}
};

var test = function(cond) {
	if (!cond) throw "test failed";
};

var test_calcd0_simple = function() {
	test(0 === calcd0_simple(1));
	test(1 === calcd0_simple(2));
	test(2 === calcd0_simple(3));
	test(2 === calcd0_simple(4));
	test(4 === calcd0_simple(5));
	test(4 === calcd0_simple(6));
	test(4 === calcd0_simple(7));
	test(4 === calcd0_simple(8));
	test(8 === calcd0_simple(9));
};

var test_calcd0_range = function() {
	for(var x = 1; x <= 1000; x++) {
		//console.log(x, calcd0_simple(x), calcd0_optimized(x));
		test(calcd0_simple(x) === calcd0_optimized(x));
	}
};


var draw_jfa_diagram = function(page, imgData0, imgData1, w, h)
{
	var srcInd = 0, dstInd = 0;
	var data0 = imgData0.data, data1 = imgData1.data;
	for(var r = 0; r < h; r++) {
		for(var c = 0; c < w; c++) {
			var x = Math.floor(page[srcInd++]);
			var y = Math.floor(page[srcInd++]);


			var byteInd = (w * y + x) * 4;
			var re = data0[byteInd++];
			var gr = data0[byteInd++];
			var bl = data0[byteInd++];
			var dx = x - c, dy = y - r;
			var distsq = dx * dx + dy * dy;
			var gray = Math.max(0.0, Math.min(1.0, distsq / 5000.0));

			// sqrt approx for [0, 1]:
			gray = 0.5224897950122358*(gray+(gray/(gray+0.09419608116149902))); 


			gray = 1 - gray;
			gray = Math.max(0.3, gray);
			if (x === c && y === r) gray *= 0.75;
			data1[dstInd++] = Math.max(0, Math.min(re * gray, 255));
			data1[dstInd++] = Math.max(0, Math.min(gr * gray, 255));
			data1[dstInd++] = Math.max(0, Math.min(bl * gray, 255));
			data1[dstInd++] = 255;
		
		}
	}
};


var clear_drawing = function() {
	ctx0.clearRect(0, 0, ctx0.w, ctx0.h);
	ctx2.clearRect(0, 0, ctx2.w, ctx2.h);
	imageChanged = true;
};


var clear_button_clicked = function() {
	console.log("clear_button_clicked");
	clear_drawing();
};

function body_onload()
{
	console.log("body_onload");


	var canvas0 = document.getElementById("canvas2");
	//var canvas1 = document.getElementById("canvas1");
	var canvas2 = document.getElementById("canvas0");
	ctx0 = canvas0.getContext("2d");
	//ctx1 = canvas1.getContext("2d");
	ctx2 = canvas2.getContext("2d");


	//var canvasW = canvas0.getBoundingClientRect().width;
	//var canvasH = canvas0.getBoundingClientRect().height;
	var canvasW = canvas0.scrollWidth;
	var canvasH = canvas0.scrollHeight;
	var w = canvasW, h = canvasH;

	ctx0.w = w;
	ctx0.h = h;
	//ctx1.w = w;
	//ctx1.h = h;
	ctx2.w = w;
	ctx2.h = h;

	var dummy = document.createElement('canvas');
	dummy.width = w;
	dummy.height = h;

	var ctxdummy = dummy.getContext("2d");
	ctxdummy.w = w;
	ctxdummy.h = h;

	var elapsed = 0.0;

	var pages = [
		new Array(ctx0.w * ctx0.h * 2), 
		new Array(ctx0.w * ctx0.h * 2)
	];

	//var imgData1 = ctx1.getImageData(0, 0, w, h);
	var imgData2 = ctx2.getImageData(0, 0, w, h);

	var prevx = undefined, prevy = undefined;
	var currColor = randomColor();
	var drawing = false;
	var targetCanvas = null;
	var button = 0;

	var drawone = function(x, y) {
		if (prevx === undefined) prevx = x;
		if (prevy === undefined) prevy = y;		
		var thick = button === 0 ? LEFT_MOUSE_THICK : RIGHT_MOUSE_THICK;
		drawSegment(ctx0, ctxdummy, prevx, prevy, x, y, currColor, thick);
		prevx = x;
		prevy = y;

		imageChanged = true;
	};

	document.addEventListener('mouseup', e => {
		if (e.button === button)
			drawing = false;
	});

	canvas2.addEventListener('mousedown', e => {
		if (drawing) return; // Cannot interrupt by pressing a different mouse button
		targetCanvas = canvas2;
		drawing = true;
		currColor = randomColor();
		prevx = undefined;
		prevy = undefined;
		button = e.button;
		drawone(e.offsetX+0.5, e.offsetY+0.5);
	});	
	canvas0.addEventListener('mousedown', e => {
		if (drawing) return; // Cannot interrupt by pressing a different mouse button
		targetCanvas = canvas0;
		drawing = true;
		currColor = randomColor();
		prevx = undefined;
		prevy = undefined;
		button = e.button;
		drawone(e.offsetX+0.5, e.offsetY+0.5);
	});	
	canvas2.addEventListener('mousemove', e => {
		if (canvas2 !== targetCanvas) return;
		if (drawing) {
			drawone(e.offsetX+0.5, e.offsetY+0.5);
		}
	});
	canvas0.addEventListener('mousemove', e => {
		if (canvas0 !== targetCanvas) return;
		if (drawing) {
			drawone(e.offsetX+0.5, e.offsetY+0.5);
		}
	});

	// Disable right mouse context menu.
	var button0 = document.getElementById("button0");
	button0.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); }
	canvas2.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); }
	canvas0.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); }


	// disable context menu stackoverflow.com/a/18289655
	document.oncontextmenu = function(e){
	 var evt = new Object({keyCode:93});
	 stopEvent(e);
	 keyboardUp(evt);
	}
	function stopEvent(event){
	 if(event.preventDefault != undefined)
	  event.preventDefault();
	 if(event.stopPropagation != undefined)
	  event.stopPropagation();
	}


	clear_drawing();

	var drawNewFrame = function() {

		var frameDelta = 1.0 / 60.0;
		//drawInitialImage(ctx0, ctxdummy);

		if (imageChanged) {
			var imgData0 = ctx0.getImageData(0, 0, w, h);
			copy_image_to_array(w, h, imgData0, pages[0]);
			apply_jfa(pages, w, h);
			draw_jfa_diagram(pages[0], imgData0, imgData2, w, h, 2);
			ctx2.putImageData(imgData2, 0, 0);

			imageChanged = false;
		}

		elapsed += frameDelta;
	};

	var frameRequest = requestAnimationFrame(
		function frameHandler(time) {
			drawNewFrame();
		    frameRequest = requestAnimationFrame(frameHandler);
		}
	); 
	//cancelAnimationFrame(frameRequest);

}


test_calcd0_simple();
test_calcd0_range();
