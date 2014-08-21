
// https://github.com/bensisson/underscore-join 

ContextView = Backbone.View.extend({
	el: "#linguistic_context_view",
	events: {
		
	},
	initialize: function() {	
		// Models use the "change" event			
		this.q1 = new QueryModel();		
		this.q2 = new QueryModel();					
		this.q2.on("change", this.mergeQueries, this);
		this.params = null;

		this.freqThreshold = .005;

		//this.template = _.template($("#contextViewTemplate").html());
		//this.$el.html(_.template($("#contextViewTemplate").html()))
		//.text("("+this.q1.get("term_set").length+" terms)");		
		

		_.bindAll(this, "render", "refreshData", "mergeQueries", "refreshFilters");
	},	
	refreshData: function(params) {	
		//console.log(params)
		this.$el.empty();	
		this.$el.html(_.template($("#contextViewTemplate").html()))
		this.$el.find(".view_detail").append("<div class='loading_label'>Loading ... </div><div class='loading'></div>")
	
		this.params = params;
		this.q1.setURL(params, 1);		
		var that = this;
		this.q1.fetch({silent: true}).complete(function () {
			console.log("finished q1")
			that.q2.setURL(params, 2);		
			that.q2.fetch();
		}, this);
	},
	refreshFilters: function(params) {
		this.params = params;
		this.render();
	},
	mergeQueries: function() {
		console.log(this.q1.get("term_set").length)
		console.log(this.q2.get("term_set").length)

		//console.log(params.search_string)
		//if (params.search_string == "capacity building")
		//{
			//this.q1.get("term_set").remove(this.q1.get("term_set").where({"term": "adaptation"}))
			//console.log(this.q1.get("term_set"))
		//}

		/*var filter_test = _.filter(this.q1.get("term_set").models, function(m1) {			 
			if (m1.get("context_hits") == 2)
				return true;
		}, this);	*/
		//console.log("filter test: " + filter_test.length)
		console.time( "merge queries" )
		// There are various options for doing this - most simple is just take words that are present in both lists
		this.q2.get("term_set").reset(_.filter(this.q2.get("term_set").models, function(m1) {			 
			if (m1.get("context_hit_rate") >= this.freqThreshold)  // if (m1.get("context_hits") >= 20)
				return true;
		}, this));	
		// filter q2 models based on overlap with q1
		// TODO speed up using a dictionary based filter
		this.q2.get("term_set").reset(_.filter(this.q2.get("term_set").models, function(m2) {			 
			return _.find(this.q1.get("term_set").models, function(m1) { 				
				if (m1.get("term") == m2.get("term") && m1.get("pos") == m2.get("pos")) 
					return true; 
			}, this);
		}, this));

		// filter q1 models based on overlap with q2
		this.q1.get("term_set").reset(_.filter(this.q1.get("term_set").models, function(m1) {			 
			return _.find(this.q2.get("term_set").models, function(m2) { 
				if (m1.get("term") == m2.get("term") && m1.get("pos") == m2.get("pos")) 
					return true; 
			}, this);
		}, this));	
		// Only retain words in q1 that have at least 10 hits
		this.q1.get("term_set").reset(_.filter(this.q1.get("term_set").models, function(m1) {			 
			if (m1.get("context_hit_rate") >= this.freqThreshold)			// if (m1.get("context_hits") >= 20)
				return true;
		}, this));	
		
		console.timeEnd( "merge queries" )

		
		this.refreshFilters(this.params);

	},
	render: function() {		
	
		this.$el.empty();	
		var that = this;

		//console.log(_.template($("#contextViewTemplate").html()))
		
		this.$el.html(_.template($("#contextViewTemplate").html()))
		/*var header = this.$el.append("<div class='view_header'></div>");
		header.append("<div class='view_title'>Context Terms</div>");
		header.append("<div class='view_detail'></div>");		
		this.$el.append("<div id='linguistic_context_view_list'></div>");	*/
		//this.$el.find(".view_detail").text("("+this.q1.get("term_set").length+" terms with rate > "+(this.freqThreshold*100).toFixed(2)+"%)");	

		// compute min and max times for the time series over the whole set of models for terms
		var all_dates = new Array();
		_.each(this.q1.get("term_set").models, function (m) { all_dates = all_dates.concat(m.get("timeline").models); }, this)
		_.each(this.q2.get("term_set").models, function (m) { all_dates = all_dates.concat(m.get("timeline").models); }, this)		
		var min_time = _.min(all_dates, function(d) { return d.get("time_period").getTime(); }).get("time_period");
		var max_time = _.max(all_dates, function(d) { return d.get("time_period").getTime(); }).get("time_period");

		//console.log(this.params)
		// Whittle down the word list based on filters
		var filtered_q1 = this.q1.get("term_set").models;
		if (this.params.filter_adj == 1)
		{
			filtered_q1 = _.filter(filtered_q1, function(m1) {	if (m1.get("pos") == "adj") return true; });		 
		}
		if (this.params.filter_positive == 1)
		{
			filtered_q1 = _.filter(filtered_q1, function(m1) {	if (m1.get("polarity") == "positive") return true; });		 
		}
		if (this.params.filter_negative == 1)
		{
			filtered_q1 = _.filter(filtered_q1, function(m1) {	if (m1.get("polarity") == "negative") return true; });		 
		}
		if (this.params.filter_virtue == 1)
		{			
			filtered_q1 = _.filter(filtered_q1, function(m1) {	
				if (m1.get("term") in window.virtue_dict) 
					return true; 
			});
		}
		if (this.params.filter_vice == 1)
		{
			filtered_q1 = _.filter(filtered_q1, function(m1) {	
				if (m1.get("term") in window.vice_dict) 
					return true; 
			});
		}
		if (this.params.filter_bias == 1)
		{
			filtered_q1 = _.filter(filtered_q1, function(m1) {	
				if (m1.get("term") in window.bias_dict) 
					return true; 
			});
		}
		if (this.params.filter_zscore == 1)
		{
			// Do the z-test filering
			filtered_q1 = _.filter(filtered_q1, function(m1) {	
				//console.log(m1.get("term"))

				var m2 = this.q2.get("term_set").findWhere({term: m1.get("term"), pos: m1.get("pos")});	
				//debugger;
				// euqation for z-score from here: http://facstaff.unca.edu/dohse/Online/Stat185e/Unit3/St3_7_TestTwoP_L.htm
				var estimated_overall_proportion = parseFloat((m1.get("context_hits") + m2.get("context_hits")) / (m1.get("total_hits_all_terms") + m2.get("total_hits_all_terms")));
				//console.log(estimated_overall_proportion)

				//console.log(m1.get("context_hit_rate") - m2.get("context_hit_rate"))
				//console.log(Math.sqrt(estimated_overall_proportion * (1-estimated_overall_proportion)))
				//console.log(((1 / m1.get("context_hits")) + (1 / m2.get("context_hits"))))
				var z_score = (m1.get("context_hit_rate") - m2.get("context_hit_rate")) / Math.sqrt(estimated_overall_proportion * (1-estimated_overall_proportion) * ((1 / m1.get("total_hits_all_terms")) + (1 / m2.get("total_hits_all_terms"))));
				//console.log(z_score)
				// test for 95% sig if if abs(z) > 1.96
				if (Math.abs(z_score) > 1.96)
					return true;
			}, this);
		}
	

		this.$el.find(".view_detail").text("("+filtered_q1.length+" terms)");

		// Get a max value over all for normalizing bar lengths
		var max_value = 0;
		_.each(filtered_q1, function(m1,i) {
			var m2 = this.q2.get("term_set").findWhere({term: m1.get("term"), pos: m1.get("pos")});		
			if (m2 == null)
			{
				m2 = new ContextTerm();
			}
			if (m1.get("context_hit_rate") > max_value)
				max_value = m1.get("context_hit_rate");
			if (m2.get("context_hit_rate") > max_value)
				max_value = m2.get("context_hit_rate");
		}, this);

		/// Add a word context view for each. 
		_.each(filtered_q1, function(m1,i) {	
			var m2 = this.q2.get("term_set").findWhere({term: m1.get("term"), pos: m1.get("pos")});		
			if (m2 == null)
			{
				m2 = new ContextTerm();
			}
			var view = new ContextWordView({model1: m1, model2: m2, min_time: min_time, max_time: max_time, max_value: max_value});			
			m1.view = view;			
			this.$el.find("#linguistic_context_view_list").append(view.render().$el);					

		}, this);

		console.timeEnd("render")

		return this;

	}
});

ContextWordView = Backbone.View.extend({	
	tagName: "div",
	className: "context_word_view",
	initialize: function(options) {
		this.m1 = options.model1;
		this.m2 = options.model2;
		this.min_time = options.min_time;
		this.max_time = options.max_time;
		this.max_value = options.max_value
		_.bindAll(this, "render")
	},
	events: {
		"click .context_word" : "clickContextWord",	
	},
	clickContextWord: function () {
		// Populate the details snippets with snippets from BOTH sources
		var detailparams = new Object();
		detailparams.source_id = params.outlet1.get("outletID") + "%20" + params.outlet2.get("outletID");				
		detailparams.search_string = params.search_string;
		detailparams.context_term = this.m1.get("term");
		detailparams.context = params.context;				
		window.details_view.refreshData(detailparams);
	},
	render: function() {
		
		this.$el.append("<div class='context_word'>"+this.m1.get("term")+"</div>");
		this.$el.append("<div class='context_word_bar_view'><svg></svg></div>");
		var bar_svg = d3.select(this.el).select(".context_word_bar_view svg");
		
		var bar_view_width = 150;
		var bar_view_height = 40;
		
		var bar_scale = d3.scale.linear().domain([0, this.max_value]).range([0.5, 2*bar_view_width/3]);
		
		var tip = d3.tip()
		  .attr('class', 'd3-tip')
		  .offset([-5, 0])
		  .html(function(d,i) {
		  	if (i == 0)
		  	{
		    	return "<span style='color: #FDC491'>" + d.get("context_hits") + "</span> of " + numberWithCommas(d.get("total_hits_all_terms")) + " total hits";  // rgb(102, 174, 255)
		    }
		    else
		    {
		    	return "<span style='color: #FD8E83'>" + d.get("context_hits") + "</span> of " + numberWithCommas(d.get("total_hits_all_terms")) + " total hits"; // rgb(253, 154, 71)
		    }
		  })

		bar_svg.call(tip);

		

		// add a baseline
		bar_svg.append("line")
			.attr("x1", 50)
			.attr("y1", 0)
			.attr("x2", 50)
			.attr("y2", bar_view_height)	
			.attr("class", "baseline");

		var br = bar_svg.selectAll("rect")
						.data([this.m1, this.m2])
					  .enter().append("g")
		br.append("rect")
			.attr("x",50)
			.attr("y", function(d,i) { return i * bar_view_height / 2; })
			.attr("width", function(d) { return bar_scale(d.get("context_hit_rate")); })
			.attr("height", bar_view_height / 2)	
			.attr("class", function(d,i) { if (i == 0) return "bar1"; else return "bar2";})
			.on("click", function (d, i) { 
				var detailparams = new Object();
				// This is a little weird as I'm using the global params object but then modding it
				if (i == 0)
				{
					detailparams.source_id = params.outlet1.get("outletID");
					detailparams.outlet = params.outlet1;
				}
				else
				{
					detailparams.source_id = params.outlet2.get("outletID");
					detailparams.outlet = params.outlet2;
				}
				detailparams.search_string = params.search_string;
				detailparams.context_term = d.get("term");
				detailparams.context = params.context;
				console.log(detailparams)
				window.details_view.refreshData(detailparams);
			})
			.on("mouseover", function (d, i) { tip.show(d, i) })
			.on("mouseout", tip.hide)

		br.append("text")			
		  	.attr("x", function () { return 1; })
		  	.attr("y", function(d,i) { return i * bar_view_height / 2 + 13; })
		  	.text(function (d) { return "("+(d.get("context_hit_rate")*100).toFixed(2)+"%)"; } ) 
			.attr("class", "bar_label")



		this.$el.append("<div class='context_word_overtime'><svg></svg></div>");
		var overtime_svg = d3.select(this.el).select(".context_word_overtime svg");

		
		var overtime_svg_width = 175;
		var overtime_svg_height = 40;

		var time_data1 = this.m1.get("timeline").models;
		var time_data2 = this.m2.get("timeline").models;

		// The tooltip shown over the time graph
		var tip2 = d3.tip()
		  .attr('class', 'd3-tip')
		  .offset([-5, 0])
		  .html(function(d) {
		  	var month=new Array();
				month[0]="January";
				month[1]="February";
				month[2]="March";
				month[3]="April";
				month[4]="May";
				month[5]="June";
				month[6]="July";
				month[7]="August";
				month[8]="September";
				month[9]="October";
				month[10]="November";
				month[11]="December";
				
		  	var str1 = "";
		  	if (d[0] != undefined)
		  	{
		  		str1 = "<div><span style='color: #FDC491'>" + d[0].get("context_hits") + "</span> of " + numberWithCommas(d[0].get("total_context_hits")) + " hits</div>";
		  	}
		  	var str2 = "";
		  	if (d[1] != undefined)
		  	{
		  		str2 = "<div><span style='color: #FD8E83'>" + d[1].get("context_hits") + "</span> of " + numberWithCommas(d[1].get("total_context_hits")) + " hits</div>";
		  	}
		  	
		  	//return d.get("context_hit_rate").toFixed(2);
		  	return "<div>"+month[d[0].get("time_period").getMonth()] + ", " + d[0].get("time_period").getFullYear() +"</div>" + str1 + str2
		  	
		  })

		overtime_svg.call(tip2);

		// Scales for x and y
		var x = d3.time.scale()
    			.range([0, overtime_svg_width])
    			.domain([this.min_time, this.max_time]);
    			//.domain(d3.extent(time_data1, function(d) { return d.get("time_period"); }));
    	var y = d3.scale.linear()
    			.range([overtime_svg_height, 0])    			
    			.domain([0, _.max(time_data1.concat(time_data2), function(d) { return d.get("context_hit_rate"); }).get("context_hit_rate")]);


    	var months = x.ticks(d3.time.months, 1);
		
		// If the timeline doesn't have certain months, then fill it in
		_.each(months, function(month) {
			var has_month = false;
			_.each(time_data1, function (m) {
				if (m.get("time_period").getTime() == month.getTime())
					has_month = true;
			});
			if (has_month == false)
			{
				var tm = new TimelineModel();
				tm.set("time_period", month);
				time_data1.push(tm);
			}			
		});
		// If the timeline doesn't have certain months, then fill it in
		_.each(months, function(month) {
			var has_month = false;
			_.each(time_data2, function (m) {
				if (m.get("time_period").getTime() == month.getTime())
					has_month = true;
			});
			if (has_month == false)
			{
				var tm = new TimelineModel();
				tm.set("time_period", month);
				time_data2.push(tm);
			}			
		});
		this.m1.get("timeline").reset(time_data1);
		this.m1.get("timeline").sort();
		time_data1 = this.m1.get("timeline").models;
		this.m2.get("timeline").reset(time_data2);
		this.m2.get("timeline").sort();
		time_data2 = this.m2.get("timeline").models;
		//console.log(time_data1)

		// This element catches mousemove events on the timeline so that we can show the tooltip
		overtime_svg.append("rect")
			.data([this.m1, this.m2])
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", x(this.max_time))
			.attr("height", overtime_svg_height)
			.style("fill", "#ffffff")
			.style("fill-opacity", 0)
			//.on("mouseover", tip2.show)
			.on("mousemove", function (d) {				
				// compute month
				var xp = d3.mouse(this)[0];			
				//console.log(x)
				var month = Math.floor(xp / (overtime_svg_width / months.length));
				//console.log(x(months[month]))
				//tip2.offset([y(time_data1[month].get("context_hit_rate")) - 7, -overtime_svg_width/2 + x(months[month])])
				tip2.offset([-5, -overtime_svg_width/2 + x(months[month])])
				//d3.select(this).datum(time_data1[month]);
				tip2.show([time_data1[month], time_data2[month]])
			})
			.on("click", function (d) {
				// Define a month long window to query
				var xp = d3.mouse(this)[0];							
				var month = Math.floor(xp / (overtime_svg_width / months.length));				
				var from_date = months[month];
				var to_date = undefined;
				if (month != months.length-1)
					var to_date = months[month+1];

				// Fill in the details snippets
				var detailparams = new Object();
				detailparams.source_id = params.outlet1.get("outletID") + "%20" + params.outlet2.get("outletID");				
				detailparams.search_string = params.search_string;				
				detailparams.context_term = d.get("term");
				detailparams.context = params.context;		
				detailparams.from_date = from_date;
				detailparams.to_date = to_date;		
				window.details_view.refreshData(detailparams);

			}, this)
			.on("mouseout", tip2.hide)

		var area = d3.svg.area()
			.x(function(d) { return x(d.get("time_period")); })
			.y(overtime_svg_height)
			.y1(function(d) { return y(d.get("context_hit_rate")); })		


		overtime_svg.append("path")
	      .datum(time_data1)
	      .attr("class", "area1")
	      .attr("d", area);

	    overtime_svg.append("path")
	      .datum(time_data2)
	      .attr("class", "area2")
	      .attr("d", area);

	   var line = d3.svg.line()
    		.x(function(d) { return x(d.get("time_period")); })
    		.y(function(d) { return y(d.get("context_hit_rate")); });

    	overtime_svg.append("path")
    		.attr("d", line(time_data1))
    		.attr("class", "line")

    	overtime_svg.append("path")
    		.attr("d", line(time_data2))
    		.attr("class", "line")
		
		return this;
	}
})


DetailsView = Backbone.View.extend({
	el: "#details_view",
	events: {
		
	},
	initialize: function() {	
		this.detailType = "news";

		this.dc = new DetailsCollection();
		this.bdc = new BlogDetailsCollection();
		this.dc.on("reset", this.render, this);
		this.bdc.on("reset", this.render, this)
		this.hide_loading = false;
		this.xhr = null;
		
		_.bindAll(this, "render", "refreshData", "fetchData");
	},	
	refreshData: function(params) {	
		console.log("refresh data")
		this.$el.empty();
		this.dc.reset();
		this.bdc.reset();
		this.hide_loading = false;
		this.abortFetch();

		this.params = params;

		this.$el.html(_.template($("#detailsViewTemplate").html()));
		
		if(!this.hide_loading)
			this.$el.find(".view_detail").append("<div class='loading_label'>Loading ... </div><div class='loading'></div><div class='loading_hits_found_label'></div>");
		else
			this.$el.find(".view_detail").append("<div class='loading_hits_found_label'></div>");
		

		if (params.outlet.get("outletType") == "news")
		{
			this.detailType = "news";
			params.pagesize = 50;
		}
		if (params.outlet.get("outletType") == "blogs")
		{
			this.detailType = "blogs";
			params.pagesize = 500;
		}

		
		params.offset = 0;
		this.fetchData(params);
		//for (var page = 0;page < 10;page ++)
		//{
			//params.offset = page * params.pagesize;				
			//this.dc.setURL(params);
			//this.dc.fetch();
			//this.dc.fetch({
			//	success: function(collection) {
					//console.log(collection.length)
					//if (collection.length == 0)
					//	break;
			//	}
			//});
		//}
	},
	fetchData: function(params) {
		if (this.detailType == "news")
		{
			this.dc.setURL(params);
			console.log("fetching")
			var that = this;
			var old_length = that.dc.length;
			
			// Getting the xhr is important in case we want to abort
			that.xhr = that.dc.fetch({
				remove: false, // make the collection accrete
				success: function(collection)
				{
					console.log(collection.length)
					console.log(old_length)
					if (collection.length != old_length)
					{										
						that.render();
						params.offset += params.pagesize;					
						that.fetchData(params);
					}
					else
					{
						that.hide_loading = true;
						that.render();
					}
				}
			})
		}
		else if (this.detailType == "blogs")
		{
			this.bdc.setURL(params);
			console.log("fetching");
			var that = this;
			var old_length = that.bdc.length;
			
			// Getting the xhr is important in case we want to abort
			that.xhr = that.bdc.fetch({
				remove: false, // make the collection accrete
				success: function(collection)
				{
					console.log(collection.length)
					console.log(old_length);
					console.log(that.bdc.num_found)
					//if (collection.length != old_length)
					if (params.offset + params.pagesize < that.bdc.num_found)
					{										
						that.render();
						params.offset += params.pagesize;					
						that.fetchData(params);
					}
					else
					{
						that.hide_loading = true;
						that.render();
					}
				}
			})
		}
		
	},
	abortFetch: function() {
		//console.log("aborting");
		//console.log(this.xhr)
		if (this.xhr != null)
			this.xhr.abort();
	},
	clearView: function () {
		this.dc.reset();
		this.bdc.reset();
		this.$el.empty();
		
	},
	render: function() {
		//console.log()
		this.$el.empty();

		this.dc.sort();
		this.bdc.sort();

		this.$el.html(_.template($("#detailsViewTemplate").html()));
		

		if(!this.hide_loading)
			this.$el.find(".view_detail").append("<div class='loading_label'>Loading ... </div><div class='loading'></div><div class='loading_hits_found_label'></div>");
		else
			this.$el.find(".view_detail").append("<div class='loading_hits_found_label'></div>");
		
	
		if (this.detailType == "news")
		{
			this.$el.find(".loading_hits_found_label").text("("+this.dc.length+" articles)");	
			_.each(this.dc.models, function(m,i) {			
				var view = new DetailsSnippetView({model: m});
				view.params = this.params;			
				m.view = view;			
				this.$el.find("#details_view_list").append(view.render().$el);					
			}, this);
		}
		else if (this.detailType == "blogs")
		{
			this.$el.find(".loading_hits_found_label").text("("+this.bdc.length+" articles)");	
			_.each(this.bdc.models, function(m,i) {			
				var view = new BlogDetailsSnippetView({model: m});
				view.params = this.params;			
				m.view = view;			
				this.$el.find("#details_view_list").append(view.render().$el);					
			}, this);
		}
		return this;
	}
});


DetailsSnippetView = Backbone.View.extend({	
	tagName: "div",
	className: "details_snippet_view",
	initialize: function(options) {
		_.bindAll(this, "render")
	},
	render: function() {
		

		this.$el.append("<a class='details_snippet_title' target='_blank' href='"+this.model.get("link")+"'>"+this.model.get("title")+"</div>");
		this.$el.append("<div class='details_snippet_date'>"+(this.model.get("published_at").getMonth()+1)+"/"+this.model.get("published_at").getDate()+"/"+this.model.get("published_at").getFullYear()+"</div>");
		_.each(this.model.get("snippet_set"), function (s) {
			this.$el.append("<div class='details_snippet'>"+s+"</div>");
		}, this);

		// highlight
		var spanclass = "outlet1_highlight";
		//if (this.params.source_id == params.source2)
		//	spanclass = "outlet2";
		// Switch the coloring on the source of the snippet
		if(this.model.get("source_guid") == params.outlet2.get("outletID"))
			spanclass = "outlet2_highlight";

		var that = this;
		var contextTermRegEx = new RegExp("\\b"+this.params.context_term+"\\b","ig");
		this.$el.find(".details_snippet").each(function(i, e) {
			$(this).html($(this).html().replace(contextTermRegEx, "<span class='"+spanclass+"'>"+that.params.context_term+"</span>"));
		});
		var searchTermRegEx = new RegExp("\\b"+this.params.search_string+"\\b","ig");
		this.$el.find(".details_snippet").each(function(i, e) {
			$(this).html($(this).html().replace(searchTermRegEx, "<span class='"+spanclass+"'>"+that.params.search_string+"</span>"));
		});
		return this;
	}
})

BlogDetailsSnippetView = Backbone.View.extend({	
	tagName: "div",
	className: "details_snippet_view",
	initialize: function(options) {
		_.bindAll(this, "render")
	},
	events: {
		"click .details_snippet_fulllink" : "clickURL",	
	},
	clickURL: function(e) {
		/*console.log($(e.currentTarget).data("guid"))
		var guid = $(e.currentTarget).data("guid");
		console.log("https://clu.uni.no/test/flask/2/posts/"+guid+"/html/")
		//console.log(e.data("guid"))
		$.ajax({
		    type: "GET",
		    context: this,
		    url: "https://clu.uni.no/test/flask/2/posts/"+guid+"/html/",	    		    
		    contentType: "application/json",
		    success: function(post){
		    	console.log(post)
		    	//post_json = JSON.parse(post);
		    	//console.log(post_json.url);

		    	var win = window.open();
		    	$(w.document.body).html(post)
		    	win.focus();
		    }
		});


		e.preventDefault();
		e.stopImmediatePropagation();*/
	},
	render: function() {
		

		this.$el.append("<a class='details_snippet_title' target='_blank' data-guid='"+this.model.get("guid")+"' href='http://"+this.model.get("url")+"'>"+this.model.get("url")+"</a>");
		this.$el.append(" (<a class='details_snippet_fulllink' target='_blank' data-guid='"+this.model.get("guid")+"' href='"+"https://clu.uni.no/test/flask/2/posts/"+this.model.get("guid")+"/html/"+"'>original post html</a>)");
		this.$el.append("<div class='details_snippet_date'>"+(this.model.get("date").getMonth()+1)+"/"+this.model.get("date").getDate()+"/"+this.model.get("date").getFullYear()+"</div>");
		_.each(this.model.get("snippet_set"), function (s) {
			this.$el.append("<div class='details_snippet'>"+s+"</div>");
		}, this);

		// highlight
		var spanclass = "outlet1_highlight";
		//if (this.params.source_id == params.source2)
		//	spanclass = "outlet2";
		// Switch the coloring on the source of the snippet
		if(this.model.get("sceptics_class") == params.outlet2.get("sceptics_class"))
			spanclass = "outlet2_highlight";

		//console.log()
		//console.log(this.params.context_term)

		var that = this;
		var contextTermRegEx = new RegExp("\\b"+this.params.context_term+"\\b","igm");
		this.$el.find(".details_snippet").each(function(i, e) {
			//console.log(i)
			//console.log($(this).html())
			$(this).html($(this).html().replace(contextTermRegEx, "<span class='"+spanclass+"'>"+that.params.context_term+"</span>"));
		});
		//var searchTermRegEx = new RegExp("\\b"+this.params.search_string+"\\b","igm");
		var searchTermRegEx = new RegExp("\\b"+this.params.search_string,"igm");
		this.$el.find(".details_snippet").each(function(i, e) {
			$(this).html($(this).html().replace(searchTermRegEx, "<span class='"+spanclass+"'>"+that.params.search_string+"</span>"));
		});
		return this;
	}
})

