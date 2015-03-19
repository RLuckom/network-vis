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

networkVisApp.factory('arrayUtils', function() {
  var instance = {};
  instance.setFromPropertyName = function(objectArray, propertyName) {
    return objectArray.reduce(function(prev, current, indx, arr) {
      if ($.inArray(current[propertyName], prev) === -1) {
        prev.push(current[propertyName]);
      }
      return prev;
    }, []);
  },
  instance.buildRowByProperty = function(propertyName, valueSet, objectArray) {
    return valueSet.reduce(function(prev, current, indx, arr) {
      prev.push(objectArray.filter(function(el, indx, arr) {
        return el[propertyName] === current;
      }).length);
      return prev;
    }, []);
  },
  instance.matrixFromObjectArray = function(objectArray, axis1, axis2) {
    return instance.setFromPropertyName(objectArray, axis1).reduce(
      function(prev, current, indx, arr) {
        prev.push(instance.buildRowByProperty(axis2, arr, objectArray.filter(
          function(el, indx, arr) {
            return el[axis1] === current;
          })
        ));
        return prev;
      }, []);
  };
  return instance;
});

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

networkVisApp.controller('aboutController', ["$scope", function($scope) {
  return $scope;}]); 

networkVisApp.controller('chordController', ['$scope', '$http', 'ipUtils', 'arrayUtils', 
  function($scope, $http, ipUtils, arrayUtils) {
    $http.get('../netflows.json').success(function(data) {
      var innerRadius = 100,
      outerRadius = 450,
      majorAngle = 2 * Math.PI / 3,
      minorAngle = 1 * Math.PI / 12,
      degrees = function(rads) {
        return rads / Math.PI * 180 - 90;
      };


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

      // We have three types of things we want to draw:
      //
      //  1. axis lines
      //  2. node circles
      //  3. connection paths
      //
      // These have the following data dependencies:
      //
      //  1. axis lines
      //    a) The angle of the line based on the specific axis
      //    b) the length of the line based on the domain of the axis
      //
      //  2. node circles
      //    a) the angle along which to draw the point
      //    b) the radius from the center at which to draw it
      //
      //  3. connection paths 
      //    a) the angle and radius of the source node
      //    b) the angle and radius of the destination node
      //
      // The first two of these can be represented by exceptionally simple
      // objects, especially once we notice that the dependencies for them are
      // essentially the same:
      //
      //   1. [{ angle: a, radius: r}...]
      //   2. [{ angle: a, radius: r}...]
      //
      // The connection paths are not so straightforward, because they are
      // processed in the d3.hive.link function which draws splines from point to
      // point. But in the simplest case it turns out that what we need is just 
      // two of the objects representing nodes:
      //
      //   3. [{source: { angle: a, radius: r}, 
      //        target: { angle: a, radius: r}}...]
      //
      // It turns out that all we needed, for all of this, were a bunch of 
      // polar coordinates!
      //
      // These objects can also contain arbitrary other elements, for instance 
      // anything required to print a sensible description string about them or 
      // color them. For now, let's say that each will also provide a toString
      // method that will describe it.
      //
      // Now we can start to imagine that we could encapsulate all of this in a
      // directive. It would have three arguments and could take cues on size
      // and scales from the existing DOM and the data to be plotted. It could
      // communicate based on scope or callbacks. For instance, instead of
      // providing actual angles in the angle property, we'll provide an ID of
      // the axis. The directive will count and assign angles to the axes
      // internally, then assign the actual angles where they're needed.
      //
      // First, let's see what we can do do get the data into that shape.
      
        
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
                   {angle: angle('source-port'), radius: radius(data.length)},
                   {angle: angle('target-port'), radius: radius(data.length)},
                   {angle: angle('flow'), radius: radius(data.length)}
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
      var center = {x: outerRadius * .7, y: outerRadius * 1.1};
      
      var svg = d3.select("#d3-container").append('svg')
      .append('g')
      .attr('transform', "translate(" + center.x + "," + center.y + ")");

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
      .data(axes)
      .enter().append("line")
      .attr("class", "axis")
      .attr("transform", function(d) {return "rotate(" + degrees(d.angle) + ")"; })
      .attr("x1", radius(-2))
      .attr("x2", function (d) {return d.radius;})
      .on("mouseover", function(d) {return mouseFunctionFactory(d.mouseover)(d, d3.select(this));})
      .on("mouseout", function(d) {return mouseFunctionFactory(d.mouseout)(d, d3.select(this)); });

      svg.append("g")
      .attr("class", "links")
      .selectAll(".link")
      .data(connPaths)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.hive.link())
      .on("mouseover", function(d) {return mouseFunctionFactory(d.mouseover)(d, d3.select(this));})
      .on("mouseout", function(d) {return mouseFunctionFactory(d.mouseout)(d, d3.select(this)); });

      window.circTypes = [];

      svg.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodeList)
      .enter().append("circle")
      .attr("class", "node")
      .attr("transform", function(d) { return "rotate(" + degrees(d.angle) + ")";})
        .attr("cx", function(d) {return d.radius;})
        .attr("r", 4)
        .on("mouseover", function(d) {return mouseFunctionFactory(d.mouseover)(d, d3.select(this));})
        .on("mouseout", function(d) {return mouseFunctionFactory(d.mouseout)(d, d3.select(this)); });

    });
  }]);
