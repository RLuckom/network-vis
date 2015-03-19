var networkVisApp = angular.module('networkVisApp', [
  "ngRoute",
]);

networkVisApp.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  when('/about', {
    templateUrl: 'partials/about.html',
    controller: 'aboutController'
  }).
  when('/vis', {
    templateUrl: 'partials/flowvis.html',
    controller: 'chordController'
  }).
  otherwise({
    redirectTo: '/vis'
  });
}]);

networkVisApp.factory("ipUtils", function() {
  return {
    getPort: function(str) {
      return /\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:(\d{1,5})/.exec(str)[1]
    },
    getIP: function(str) {
      return /(\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3})/.exec(str)[1]
    }
  }
});


var makeSVG = function(a, element) {
  var degrees = function(rads) { return rads / Math.PI * 180 - 90;};

  var svg = d3.select(element).append('svg')
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
               thiz);
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

networkVisApp.directive('rlHivePlot', [function() {
  var link = function(scope, element, attrs) {
    scope.$watch(function() { return scope.svgArgs;},
                 function() { if (scope.svgArgs) {return makeSVG(scope.svgArgs, element[0]);}});
  };
  return {link: link};
}]);

networkVisApp.controller('aboutController', ["$scope", function($scope) {
  return $scope;}]); 

networkVisApp.controller('chordController', ['$scope', '$http', 'ipUtils', 
  function($scope, $http, ipUtils) {
    $http.get('../netflows.json').success(function(data) {
      var innerRadius = 100,
      outerRadius = 900,
      majorAngle = 2 * Math.PI / 3,
      minorAngle = 1 * Math.PI / 12,
      center = {x: outerRadius * .53, y: outerRadius * 1.1};


      // D3 scale objects translate between input & output domains
      var angle = d3.scale.ordinal()
      .domain(['source-port', 'flow', 'target-port'])
      .range([ -2 * minorAngle, 0, 2 * minorAngle]);
      var radius = d3.scale.linear()
      .domain([0, data.length])
      .range([innerRadius, outerRadius]);


      var defaultInfo = "Showing source and destination ports for " + data.length + " netflow records";
      $scope.description = defaultInfo; 

      data.forEach(function(node) {
        node.sourcePort = ipUtils.getPort(node.sourceWithPort);
        node.destPort = ipUtils.getPort(node.destWithPort);
      });
        
      var mouseout = function(d, links, nodes, activeNodes, thisElement) {
        activeNodes.classed("active", false);
        $scope.description = defaultInfo;
        $scope.$apply();
      };
      var nodeMouseOver = function(d, links, nodes, activeNodes, thisElement) {
        links.classed("active", function(p) { return p.source === d || p.target === d; });
        thisElement.classed("active", true);
        if (d.type === "flow")  {
          $scope.description = d.record;
        }
        if (d.type === "source-port")  {
          $scope.description = "Source port " + d.port + " traffic. Each path is to a request that originated on that port.";
        }
        if (d.type === "target-port")  {
          $scope.description = "Destination port " + d.port + " traffic. Each path is to a request that ended on that port.";
        }
        $scope.$apply();

      };

      var linkMouseOver = function(d, links, nodes, activeNodes, thisElement) {
        links.classed("active", function(p) { return p === d; });
        nodes.classed("active", function(p) { return p === d.source || p === d.target; });
      }
      var axes = [
                   {angle: angle('source-port'), x1: radius(-2), x2: radius(data.length)},
                   {angle: angle('target-port'), x1: radius(-2), x2: radius(data.length)},
                   {angle: angle('flow'), x1: radius(-2), x2: radius(data.length)}
                 ],
          nodeList = [],
          connPaths = [],
          sourceNodes = {}
          destNodes = {};

      var portScale = d3.scale.log()
        .domain([1, 65536])
        .range([innerRadius, outerRadius]);

      data.map(function(d, i, a) {
        var sourcePortNode = sourceNodes[d.sourcePort] ? sourceNodes[d.sourcePort] :
                             sourceNodes[d.sourcePort] = {
                                angle: angle('source-port'),
                                port: d.sourcePort,
                                type: 'source-port',
                                radius: portScale(parseInt(d.sourcePort) + 1),
                                mouseover: nodeMouseOver,
                                mouseout: mouseout
                              },
            destPortNode = destNodes[d.destPort] ? destNodes[d.destPort] :
                           destNodes[d.destPort] = {
                              angle: angle('target-port'),
                              type: 'target-port',
                              port: d.destPort,
                              radius: portScale(parseInt(d.destPort) + 1),
                              mouseover: nodeMouseOver,
                              mouseout: mouseout
                            },
            flowNode = {
                          angle: angle('flow'),
                          type: 'flow',
                          record: d,
                          radius: radius(i),
                          mouseover: nodeMouseOver,
                          mouseout: mouseout
                       };
        nodeList.push(sourcePortNode);
        nodeList.push(destPortNode);
        nodeList.push(flowNode);
        connPaths.push({
                         source: sourcePortNode, 
                         target: flowNode, 
                         mouseover: linkMouseOver,
                         mouseout: mouseout
                       });
        connPaths.push({
                         source: flowNode, 
                         target: destPortNode,
                         mouseover: linkMouseOver,
                         mouseout: mouseout
                       });
      });

      $scope.svgArgs = {
                  center: center,
                  axes: axes,
                  links: connPaths,
                  nodes: nodeList
                };
                 

    });
  }]);
