
// https://github.com/bensisson/underscore-join 

CompareCloud = Backbone.View.extend({
	el: "#primary_view",
	initialize: function () {
		this.pm1 = new PrevalenceModel();
		this.pm2 = new PrevalenceModel();
		this.ccterms = new CCTermCollection();
		this.params = window.params;
	},
	refreshData: function() {			
		//this.$el.empty();	
		//this.$el.html(_.template($("#compareCloudTemplate").html()))
		
		this.pm1 = new PrevalenceModel();
		this.pm2 = new PrevalenceModel();

		this.pm1.setURL(window.params.corpus1.get("corpusID"), window.params.search_term);		
		var that = this;
		this.pm1.fetch({
			silent: true,
			success: function () {
				that.pm2.setURL(window.params.corpus2.get("corpusID"), window.params.search_term);
				that.pm2.fetch({
					success: function () {					
						that.refreshFilters(window.params);				
					},
					error: function () {
						alert("Missing context dataset C2")
					}
				});
			},		
			error: function () {
				alert("Missing context dataset C1")
			}
		}, this);
	},
	createCCTermCollection: function () {
		var thresh = 0.00;
		this.ccterms = new CCTermCollection();
		
		console.log(this.pm1.get("anchorTermPostHits"))
		console.log(this.pm2.get("anchorTermPostHits"))
		// If we're looking at a top level prevalence then anchorTermPostHits will be zero
		if (this.pm1.get("anchorTerm") == "")
		{
			_.each(this.pm1.get("terms").models, function (m) {	
				if (m.get("filteredOut") == 0)	
				{
					this.ccterms.add({term: m.get("term"), postHits_c1: m.get("postHits"), sentenceHits_c1: m.get("sentenceHits"), postRate_c1: m.get("postHits") / this.pm1.get("totalPosts"), sentenceRate_c1: m.get("sentenceHits") / this.pm1.get("totalSentences")});		
					//console.log(this.pm1.get("totalPosts"))	
				}
			}, this)
			_.each(this.pm2.get("terms").models, function (m) {		
				if (m.get("filteredOut") == 0)
				{
					var cct = this.ccterms.findWhere({term: m.get("term")});
					if (cct != null)
					{
						cct.set("postHits_c2", m.get("postHits"));
						cct.set("postRate_c2", m.get("postHits") / this.pm2.get("totalPosts"));
						cct.set("sentenceHits_c2", m.get("sentenceHits"));
						cct.set("sentenceRate_c2", m.get("postHits") / this.pm2.get("totalSentences"));						
					}
					else
					{
						this.ccterms.add({term: m.get("term"), postHits_c2: m.get("postHits"), sentenceHits_c2: m.get("sentenceHits"), postRate_c2: m.get("postHits") / this.pm2.get("totalPosts"), sentenceRate_c2: m.get("sentenceHits") / this.pm2.get("totalSentences")});		
					}
				}
			}, this)
			_.each(this.ccterms.models, function (m) {
				m.set("combinedPostRate", (m.get("postHits_c1") + m.get("postHits_c2")) / (this.pm1.get("totalPosts") + this.pm2.get("totalPosts")));
				m.set("combinedSentenceRate", (m.get("sentenceHits_c1") + m.get("sentenceHits_c2")) / (this.pm1.get("totalSentences") + this.pm2.get("totalSentences")));
				//console.log(m.get("combinedPostRate"))
			}, this)
		}
		else
		{			
			_.each(this.pm1.get("terms").models, function (m) {	
				if (m.get("filteredOut") == 0)	
				{
					this.ccterms.add({term: m.get("term"), postHits_c1: m.get("postHits"), sentenceHits_c1: m.get("sentenceHits"), postRate_c1: m.get("postHits") / this.pm1.get("anchorTermPostHits"), sentenceRate_c1: m.get("sentenceHits") / this.pm1.get("anchorTermSentenceHits")});			
				}
			}, this)
			_.each(this.pm2.get("terms").models, function (m) {		
				if (m.get("filteredOut") == 0)
				{
					var cct = this.ccterms.findWhere({term: m.get("term")});
					if (cct != null)
					{						
						cct.set("postHits_c2", m.get("postHits"));					
						cct.set("postRate_c2", m.get("postHits") / this.pm2.get("anchorTermPostHits"));
						cct.set("sentenceHits_c2", m.get("sentenceHits"));
						cct.set("sentenceRate_c2", m.get("postHits") / this.pm2.get("anchorTermSentenceHits"));	
					}
					else
					{
						this.ccterms.add({term: m.get("term"), postHits_c2: m.get("postHits"), sentenceHits_c2: m.get("sentenceHits"), postRate_c2: m.get("postHits") / this.pm2.get("anchorTermPostHits"), sentenceRate_c2: m.get("sentenceHits") / this.pm2.get("anchorTermSentenceHits")});
					}
				}
			}, this)
			_.each(this.ccterms.models, function (m) {
				m.set("combinedPostRate", (m.get("postHits_c1") + m.get("postHits_c2")) / (this.pm1.get("anchorTermPostHits") + this.pm2.get("anchorTermPostHits")));
				m.set("combinedSentenceRate", (m.get("sentenceHits_c1") + m.get("sentenceHits_c2")) / (this.pm1.get("anchorTermSentenceHits") + this.pm2.get("anchorTermSentenceHits")));
			}, this)
		}
		// Filter the terms according to a threshold rate (remove some of the terms in the middle that are uninteresting?)
		this.ccterms = new CCTermCollection(_.filter(this.ccterms.models, function (m) {
			if (Math.abs(m.get("postRate_c2") - m.get("postRate_c1")) < thresh)			
				return false;
			else
				return true;
		}))
	},
	refreshFilters: function() {
		//console.log(this.pm1)
		_.each(this.pm1.get("terms").models, function (m) {
			m.set("filteredOut", 0);
		}, this);
		_.each(this.pm2.get("terms").models, function (m) {
			m.set("filteredOut", 0);
		}, this);
		
		_.each(this.pm1.get("terms").models, function (m) {
			if (window.params.filter_virtue == 1 && !(m.get("term") in window.virtue_dict))				
				m.set("filteredOut", 1);
			if (window.params.filter_vice == 1 && !(m.get("term") in window.vice_dict))				
				m.set("filteredOut", 1);					
			if (window.params.filter_bias == 1 && !(m.get("term") in window.bias_dict))				
				m.set("filteredOut", 1);
			if (window.params.filter_zscore == 1)
			{
				//http://www.statext.com/practice/ProportionTestTwo01.php
				var m2 = this.pm2.get("terms").findWhere({term: m.get("term")});	
				//console.log(m2)
				if (m2 != undefined)
				{
					// overview
					var postCount1 = this.pm1.get("totalPosts");
					var postCount2 = this.pm2.get("totalPosts");
					// Context view
					if (this.pm1.get("anchorTerm") != "")
					{
						postCount1 = m.get("anchorTermPostHits");
						postCount2 = m2.get("anchorTermPostHits");
					}
					var proportion1 = m.get("postHits") / postCount1;
					var proportion2 = m2.get("postHits") / postCount2;
					var pooled_proportions = parseFloat((m.get("postHits") + m2.get("postHits")) / (postCount1 + postCount2));
					var std_dev = Math.sqrt(pooled_proportions * (1-pooled_proportions) / postCount1 + pooled_proportions * (1 - pooled_proportions) / postCount2);
					var z_score = (proportion1 - proportion2) / std_dev;
										
					//if (Math.abs(z_score) < 1.96) // p < .05
					if (Math.abs(z_score) < 2.576) // p < .01									
						m.set("filteredOut", 1);						
					// else
					// 	console.log(z_score + " " + m.get("term"))
				}
			}
		}, this);	
		_.each(this.pm2.get("terms").models, function (m) {
			if (window.params.filter_virtue == 1 && !(m.get("term") in window.virtue_dict))				
				m.set("filteredOut", 1);
			if (window.params.filter_vice == 1 && !(m.get("term") in window.vice_dict))				
				m.set("filteredOut", 1);					
			if (window.params.filter_bias == 1 && !(m.get("term") in window.bias_dict))				
				m.set("filteredOut", 1);
			if (window.params.filter_zscore == 1)
			{
				var m2 = this.pm1.get("terms").findWhere({term: m.get("term")});	
				if (m2 != undefined)
				{
					// overview
					var postCount1 = this.pm1.get("totalPosts");
					var postCount2 = this.pm2.get("totalPosts");
					// Context view
					if (this.pm1.get("anchorTerm") != "")
					{
						postCount1 = m.get("anchorTermPostHits");
						postCount2 = m2.get("anchorTermPostHits");
					}

					var proportion1 = m.get("postHits") / postCount2;
					var proportion2 = m2.get("postHits") / postCount1;
					var pooled_proportions = parseFloat((m.get("postHits") + m2.get("postHits")) / (postCount2 + postCount1));
					var std_dev = Math.sqrt(pooled_proportions * (1-pooled_proportions) / postCount2 + pooled_proportions * (1 - pooled_proportions) / postCount1);
					var z_score = (proportion1 - proportion2) / std_dev;
					//if (Math.abs(z_score) < 1.96)
					if (Math.abs(z_score) < 2.576) // p < .01
						m.set("filteredOut", 1);
				}
			}
		}, this);		

		this.createCCTermCollection();	

		this.render();
	},
	render: function () {
		var NUM_TERMS = 200;

		this.$el.empty();	
		this.$el.html(_.template($("#compareCloudTemplate").html()))
		
		var svg = d3.select("#compare_cloud_svg");
		var width = $("#compare_cloud_svg").width();
		var height = $("#compare_cloud_svg").height();
		// console.log(width);
		// console.log(height)
		
		var xscale = d3.scale.linear().domain([-.4, .4]).range([0, width]);
		//var yscale = d3.scale.linear().domain([-1, 1]).range([0, height]);
		var yscale = d3.scale.ordinal().domain(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]).rangeBands([13, height])
		
		var colorScale = d3.scale.linear().domain([-.1, 0, .1]).interpolate(d3.interpolateRgb).range(["rgb(255,0,128)", "rgb(204,204,204)", "rgb(30,166,255)"])
		console.log(colorScale(0))
		// Get a sub sample of text nodes
		var nodes = _.sample(this.ccterms.models, NUM_TERMS);
		//console.log(nodes)
		//nodes = this.ccterms.models.slice(0,10)

		// Maps the lowest rate to 9pt font and highest rate to 20pt font
		var combinedRateMax = _.max(nodes, function(m) { return m.get("combinedPostRate"); });
		var combinedRateMin = _.min(nodes, function(m) { return m.get("combinedPostRate"); });
		//console.log(combinedRateMin);
		//console.log(combinedRateMax)
		var sizeScale = d3.scale.linear()
							.domain([combinedRateMin.get("combinedPostRate"), combinedRateMax.get("combinedPostRate")])
							.range([10, 24])

		// stopgap
		_.each(nodes, function (m) {
			m.x = xscale(m.get("postRate_c2") - m.get("postRate_c1"));
			//console.log(m)
			m.y = yscale(m.get("term").substring(0,1)) + 13* Math.random();
		}, this)

		
		var _that = this;

		var node = svg.selectAll(".term")
			.data(nodes)
			.enter().append("g")
			.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
			.on("mouseover", function (d) {
				//console.log(this)
				d3.select(this).moveToFront();
				d3.select(this).selectAll("rect").style("display", "block");
			})
			.on("mouseout", function (d) {
				d3.select(this).selectAll("rect").style("display", "none");
			})
			.on("click", function (d) {
				window.details_view.model = _.clone(d.attributes);
				//console.log(d.attributes)
				window.details_view.model = _.extend(window.details_view.model, {corpusName_c1: window.params.corpus1.get("corpusName"), corpusName_c2: window.params.corpus2.get("corpusName"), anchorTermPostHits_c1: _that.pm1.get("anchorTermPostHits"), anchorTermPostHits_c2: _that.pm2.get("anchorTermPostHits"), search_term: window.params.search_term})				
				window.details_view.model.postRate_c1_percent = (100*parseFloat(window.details_view.model.postRate_c1)).toFixed(1);
				window.details_view.model.postRate_c2_percent = (100*parseFloat(window.details_view.model.postRate_c2)).toFixed(1);
				window.details_view.render();
			})
			.on("dblclick", function (d) {
				// double click initiates a search				
				$("#search_field").val(d.attributes.term);
				window.params.search_term = $("#search_field").val();
				_that.refreshData();
				window.details_view.clearDetails();	
			})
		node.append("text")			
			.text(function (d) { return d.get("term"); } )
			.style("font-size", function (d) { return sizeScale(d.get("combinedPostRate")) })
			.attr("class", "term")
			.style("fill", function (d) {				
				return colorScale(d.get("postRate_c2") - d.get("postRate_c1"));
			})
			// .attr("class", function (d) { 
			// 	if (d.get("postRate_c2") - d.get("postRate_c1") > 0.03)
			// 		return "term c2";
			// 	else if (d.get("postRate_c2") - d.get("postRate_c1") < -0.03)
			// 		return "term c1";		
			// 	else 
			// 		return "term c3";		
			// })			
		  	.attr("x", function (d) { return 0; })
		  	.attr("y", function (d) { return 0; })

		node.append("rect")
			.attr("x", function (d) { return 0; })
			.attr("y", function (d) { 
				var bbox = d3.select(this.parentNode).select("text").node().getBBox();				
				//return bbox.height;	
				//console.log(bbox)			
				return bbox.y - 9;
			})
			.attr("width", function (d) { 
				var bbox = d3.select(this.parentNode).select("text").node().getBBox();		
				// the width is the fraction of hits attributed to corpus 1 out of all hits across both corpora		
				var ratio = d.get("postRate_c1") / (d.get("postRate_c1") + d.get("postRate_c2"));				
				// console.log(ratio)
				return bbox.width * ratio;
			})
			.attr("height", function (d) { 
				return 10;		
			})
			.attr("class", "rate_bar c1")
		node.append("rect")
			.attr("x", function (d) { 
				var bbox = d3.select(this.parentNode).select("text").node().getBBox();				
				var ratio = d.get("postRate_c1") / (d.get("postRate_c1") + d.get("postRate_c2"));
				return bbox.width * ratio;
			})
			.attr("y", function (d) { 
				var bbox = d3.select(this.parentNode).select("text").node().getBBox();
				//return bbox.height;				
				return bbox.y - 9;
			})
			.attr("width", function (d) { 
				var bbox = d3.select(this.parentNode).select("text").node().getBBox();				
				var ratio = d.get("postRate_c2") / (d.get("postRate_c1") + d.get("postRate_c2"));
				// console.log("")				
				// console.log(ratio)
				return bbox.width * ratio;
			})
			.attr("height", function (d) { 
				return 10;		
			})
			.attr("class", "rate_bar c2")

		

		//d3.select(elem).select("text").node().getBBox()
		// Add a node "pin" for each node, basically to create a link from each node back to its original position so that it's attracted there via the link strength
		var links = new Array();
		_.each(nodes, function (m) {
			var nn = new Object();
			nn.x = m.x;
			nn.y = m.y;
			nodes.push(nn);

			var link = new Object();
			link.source = m;
			//link.target = root_node;
			link.target = nn;
			links.push(link);
		}, this)
		
		// var nodes = new Array();
		// _.each(termsc1, function (m) {
		// 	var 
		// }, this)
		//console.log(d3.selectAll(".term"))
		// console.log(this.force)
		if (this.force != undefined)
			this.force.stop()

		this.force = d3.layout.force()
			.nodes(nodes)
			.size([width, height])
			.charge(-1)
			.gravity(.015)			
			.linkDistance(function (d) {						
				//return Math.sqrt((d.source.x - d.target.x) * (d.source.x - d.target.x) + (d.source.y - d.target.y) * (d.source.y - d.target.y));			
				return 0;
			})
			.linkStrength(1)
			.links(links)
			//.chargeDistance(10000)
			//.gravity(10)
		//force.start();
		
		// Give everyone a bbox since computing it is costly
		node.each(function (n, i) {			
			n.bbox = _that.getBBox(this);			
		}, this);
		this.force.on("tick", function () {
			node.each(function (n1, i) {
				// this context is the DOM element								
				node.each(function (n2, j) {					
					if (j < i)
					{						
						var o = _that.isOverlappingBox(n1.bbox, n2.bbox);
						// console.log(o)
			 			if (o == true)
			 			{						 						
			 				var bbox1 = n1.bbox;
			 				var bbox2 = n2.bbox;
			 				//console.log(bbox1)
			 				//console.log(bbox2)
			 				var xvec = (bbox1.left + bbox1.width / 2) - (bbox2.left + bbox2.width / 2);
			 				//console.log(xvec)
			 				n1.x += xvec * .02;
			 				n2.x -= xvec * .02;
			 				var yvec = (bbox1.top + bbox1.height / 2) - (bbox2.top + bbox2.height / 2);
			 				//console.log(yvec)
			 				n1.y += yvec * .02;
			 				n2.y -= yvec * .02;

			 				// Incremental update of bounding box
			 				bbox1.left += xvec * .02;
			 				bbox1.right += xvec * .02;
			 				bbox1.top += yvec * .02;
			 				bbox1.bottom += yvec * .02;
			 				bbox2.left -= xvec * .02;
			 				bbox2.right -= xvec * .02;
			 				bbox2.top -= yvec * .02;
			 				bbox2.bottom -= yvec * .02;
			 			}
					}
				}, this)
				
			}, this)
			node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
			// update bbox to new position
			// node.each(function (n, i) {			
			// 	// Update the bbox
			// 	n.bbox.left += (n.x - n.px);
			// 	n.bbox.right += (n.x - n.px);
			// 	n.bbox.top += (n.y - n.py);
			// 	n.bbox.bottom += (n.y - n.py);
			// 	//console.log(n.bbox)
			// }, this);
			// Recompute the bounding box
			node.each(function (n, i) {			
				n.bbox = _that.getBBox(this);			
			}, this);
			//node.select("text").attr("x", function (d) { return d.x })
			//node.select("text").attr("y", function (d) { return d.y })
		});

		//
		this.force.start();
		// this.force.start()
		// for (var i = 0; i < 2; ++i) this.force.tick();
		// this.force.stop();

		return this;


		// this.force.on("tick", function () {
		// 	node.each(function (n1, i) {
		// 		// this context is the DOM element
		// 		var _n1 = this;
		// 		//console.log(_n1)
		// 		//console.log(d3.select(_n1).datum())
		// 		node.each(function (n2, j) {
		// 			var _n2 = this;
		// 			if (_n1 != _n2 & j < i)
		// 			{
		// 				//console.log(j)
		// 				var o = _that.isOverlapping(_n1, _n2);
		// 				// console.log(o)
		// 	 			if (o == true)
		// 	 			{			 				
		// 	 				var bbox1 = _that.getBBox(_n1);
		// 	 				var bbox2 = _that.getBBox(_n2);
		// 	 				//console.log(bbox1)
		// 	 				// console.log(bbox2)
		// 	 				var xvec = bbox1.centerX - bbox2.centerX;
		// 	 				//console.log(xvec)
		// 	 				d3.select(_n1).datum().x += xvec * .02;
		// 	 				d3.select(_n2).datum().x -= xvec * .02;
		// 	 				var yvec = bbox1.centerY - bbox2.centerY;
		// 	 				//console.log(yvec)
		// 	 				d3.select(_n1).datum().y += yvec * .02;
		// 	 				d3.select(_n2).datum().y -= yvec * .02;
		// 	 			}
		// 			}
		// 		}, this)
				
		// 	}, this)
		// 	node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
		// 	//node.select("text").attr("x", function (d) { return d.x })
		// 	//node.select("text").attr("y", function (d) { return d.y })
		// });
	}, 
	isOverlapping: function (e1, e2)
	{
		var bbox1 = d3.select(e1).select("text").node().getBoundingClientRect();
		var bbox2 = d3.select(e2).select("text").node().getBoundingClientRect();
		
	    var o = !(bbox2.top+bbox2.height < bbox1.top || bbox1.top + bbox1.height < bbox2.top || bbox2.left + bbox2.width < bbox1.left || bbox1.left + bbox1.width < bbox2.left); 
		//console.log(o)
		return o;
	},
	isOverlappingBox: function (bbox1, bbox2)
	{
	    var o = !(bbox2.top+bbox2.height < bbox1.top || bbox1.top + bbox1.height < bbox2.top || bbox2.left + bbox2.width < bbox1.left || bbox1.left + bbox1.width < bbox2.left); 
		//console.log(o)
		return o;
	},
	getBBox: function ( elem ) {	        
        var bbox = d3.select(elem).select("text").node().getBoundingClientRect();
        var bboxrw = new Object();
        bboxrw.left = bbox.left;
        bboxrw.right = bbox.right;
        bboxrw.top = bbox.top;
        bboxrw.bottom = bbox.bottom;
        bboxrw.width = bbox.width;
        bboxrw.height = bbox.height;
        //bbox.centerX = bbox.left + bbox.width / 2;
        //bbox.centerY = bbox.top + bbox.height / 2;
        return bboxrw;
	}

})

DetailsView = Backbone.View.extend({
	el: "#details_view",
	events: {

	},
	initialize: function () {
		this.template = _.template($("#detailsTemplate").html());
		this.templateContext = _.template($("#detailsContextTemplate").html());
	}, 
	render: function () {
		this.$el.empty();
		if (window.params.search_term == "")
			this.$el.html(this.template(this.model));
		else
			this.$el.html(this.templateContext(this.model));
		return this;
	},
	clearDetails: function () {
		this.$el.empty();	
	}
})




