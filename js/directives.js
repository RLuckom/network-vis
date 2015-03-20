networkVisApp.directive('rlHivePlot', [function() {
  var makeHive = function(a, element) {
    element.empty();
    var degrees = function(rads) { return rads / Math.PI * 180 - 90;};

    var svg = d3.select(element[0]).append('svg')
    .append('g')
    .attr('transform', "translate(" + a.center.x + "," + a.center.y + ")");

    var mouseFunctionFactory = function(f) {
      return function(d, thiz) {
        if (typeof f !== 'function') {
          return;
        }
        return f(d, 
          svg.selectAll('.link'), 
          svg.selectAll('.node circle'), 
          svg.selectAll('.active'),
          thiz
        );
      };
    };


    svg.selectAll(".axis")
    .data(a.axes)
    .enter().append("line")
    .attr("class", "axis")
    .attr("transform", function(d) {return "rotate(" + degrees(d.angle) + ")"; })
    .attr("x1", function (d) {return d.x1;})
    .attr("x2", function (d) {return d.x2;})
    .on("mouseover", function(d) {return mouseFunctionFactory(d.mouseover)(d, d3.select(this));})
    .on("mouseout", function(d) {return mouseFunctionFactory(d.mouseout)(d, d3.select(this)); });
    console.log("LLL");

    svg.append("g")
    .attr("class", "links")
    .selectAll(".link")
    .data(a.links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.hive.link())
    .on("mouseover", function(d) {return mouseFunctionFactory(d.mouseover)(d, d3.select(this));})
    .on("mouseout", function(d) {return mouseFunctionFactory(d.mouseout)(d, d3.select(this)); });

    window.circTypes = [];

    svg.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(a.nodes)
    .enter().append("circle")
    .attr("class", "node")
    .attr("transform", function(d) { return "rotate(" + degrees(d.angle) + ")";})
    .attr("cx", function(d) {return d.radius;})
    .attr("r", 4)
    .on("mouseover", function(d) {return mouseFunctionFactory(d.mouseover)(d, d3.select(this));})
    .on("mouseout", function(d) {return mouseFunctionFactory(d.mouseout)(d, d3.select(this)); });
  }

  var link = function(scope, element, attrs) {
    scope.$watch(attrs.svgArgs,
      function() { if (scope.svgArgs) {return makeHive(scope.svgArgs, element);}});
  };
  return {
    link: link,
    scope: {
      svgArgs: "="
    }
  };
}]);
