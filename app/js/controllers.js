networkVisApp.controller('aboutController', ["$scope", function($scope) {
  return $scope;}
]); 

networkVisApp.controller('chordController', ['$scope', '$http', 'ipUtils', 
  function($scope, $http, ipUtils) { 

    /**
    * clear highlighted svg elements on mouseout
    *
    * @param d [Object] Data associated with svg element by d3
    * @param links [Array] array of .link elements selected by d3
    * @param nodes [Array] array of '.node circle' elements selected by d3
    * @param activeNodes [Array] array of '.active' nodes selected by d3
    * @param thisElement [Object] d3 selection of current element.
    */
    var mouseout = function(d, links, nodes, activeNodes, thisElement) {
      activeNodes.classed("active", false);
      $scope.description = $scope.defaultInfo;
      $scope.$apply();
    };

    var recordToString = function(r) {
      return (
        "NetFlow Record:\n  Time: " +  r.start + "\n  Duration: " 
        + r.duration + "\n  Source: " + r.sourceWithPort + "\n  Dest: " 
        + r.destWithPort + "\n  Protocol No: " + r.protocol + "\n  Bytes: " 
        + r.bytes
      );
    }

    /**
    * Highlight connected paths on node mouseover
    *
    * @param d [Object] Data associated with svg element by d3
    * @param links [Array] array of .link elements selected by d3
    * @param nodes [Array] array of '.node circle' elements selected by d3
    * @param activeNodes [Array] array of '.active' nodes selected by d3
    * @param thisElement [Object] d3 selection of current element.
    */
    var nodeMouseOver = function(d, links, nodes, activeNodes, thisElement) {
      links.classed("active", function(p) { return p.source === d || p.target === d; });
      thisElement.classed("active", true);
      if (d.type === "flow")  {
        $scope.description = recordToString(d.record);
      }
      if (d.type === "source")  {
        $scope.description = "Each path is to a flow that originated on port " + d.port;
      }
      if (d.type === "target")  {
        $scope.description = "Each path is to a flow that ended on port " + d.port;
      }
      $scope.$apply();
    };

    /**
    * highlight path on mouseover
    *
    * @param d [Object] Data associated with svg element by d3
    * @param links [Array] array of .link elements selected by d3
    * @param nodes [Array] array of '.node circle' elements selected by d3
    * @param activeNodes [Array] array of '.active' nodes selected by d3
    * @param thisElement [Object] d3 selection of current element.
    */
    var linkMouseOver = function(d, links, nodes, activeNodes, thisElement) {
      var flow = d.source.type == "flow" ? d.source : d.target;
      links.classed("active", function(p) { return p.source === flow || p.target === flow; });
      $scope.description = recordToString(flow.record);
      $scope.$apply();
    };

    /**
     * sets up the graph of ports and flowrecords
     *
     * @param data [Object] JSON data of netflow records
     */
    var setupHive = function(data) {
      $scope.defaultInfo = ("Showing source and destination ports for " 
      + data.length + " netflow records");
      $scope.description = $scope.defaultInfo; 
      var innerRadius = 100,
      outerRadius = 900,
      majorAngle = 2 * Math.PI / 3,
      minorAngle = 1 * Math.PI / 12,
      center = {x: outerRadius * .53, y: outerRadius * 1.1};


      // D3 scale objects translate between input & output domains
      var angle = d3.scale.ordinal()
      .domain(['source', 'flow', 'target'])
      .range([ -2 * minorAngle, 0, 2 * minorAngle]);
      var radius = d3.scale.linear()
      .domain([0, data.length + 1])
      .range([innerRadius, outerRadius]);

      data.forEach(function(node) {
        node.sourcePort = ipUtils.getPort(node.sourceWithPort);
        node.destPort = ipUtils.getPort(node.destWithPort);
      });

      var axes = [
        {angle: angle('source'), x1: radius(-2), x2: radius(data.length + 1)},
        {angle: angle('target'), x1: radius(-2), x2: radius(data.length + 1)},
        {angle: angle('flow'), x1: radius(-2), x2: radius(data.length + 1)}
      ],
      nodeList = [],
      connPaths = [],
      sourceNodes = {}
      destNodes = {};
      $scope.svgArgs = {
        center: center,
        axes: axes,
        links: connPaths,
        nodes: nodeList
      };
      if (data.length == 0) { 
        return; 
      }
      var tMax = tMin = moment(data[0].start), n, t;
      for (n = 0; n < data.length; n++) {
        t = moment(data[n].start);
        if (t < tMin) { tMin = t; }
        if (t > tMax) { tMax = t; }
      }
      var timeScale = d3.time.scale()
      .domain([tMin, tMax])
      .range([innerRadius, outerRadius]);

      var portScale = d3.scale.log()
      .domain([1, 65536])
      .range([innerRadius, outerRadius]);

      data.map(function(d, i, a) {
        var sourcePortNode = sourceNodes[d.sourcePort] ? sourceNodes[d.sourcePort] :
        sourceNodes[d.sourcePort] = {
          angle: angle('source'),
          port: d.sourcePort,
          type: 'source',
          radius: portScale(parseInt(d.sourcePort) + 1),
          mouseover: nodeMouseOver,
          mouseout: mouseout
        },
        destPortNode = destNodes[d.destPort] ? destNodes[d.destPort] :
        destNodes[d.destPort] = {
          angle: angle('target'),
          type: 'target',
          port: d.destPort,
          radius: portScale(parseInt(d.destPort) + 1),
          mouseover: nodeMouseOver,
          mouseout: mouseout
        },
        flowNode = {
          angle: angle('flow'),
          type: 'flow',
          record: d,
          radius: timeScale(moment(d.start)),
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
    };

    $http.get('../netflow5.json').success(function(data) {
      $scope.hiveData = data;
      $scope.filteredData = data;
      $scope.$watch(function() {return $scope.filteredData;},
      function() {return setupHive($scope.filteredData);});
      var filterHiveData = function() {
        var hd = $scope.hiveData;
        if ($scope.sourceIp) {
          var re = new RegExp($scope.sourceIp);
          hd = hd.filter(function(d) {
            return re.test(d.sourceWithPort);
          });
        }
        if ($scope.destIp) {
          var re = new RegExp($scope.destIp);
          hd = hd.filter(function(d) {
            return re.test(d.destWithPort);
          });
        }
        $scope.filteredData = hd;
      };

      $scope.$watch(function() {return $scope.sourceIp;}, filterHiveData);
      $scope.$watch(function() {return $scope.destIp;}, filterHiveData);
    });
  }
]);
