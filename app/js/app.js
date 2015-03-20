var networkVisApp = angular.module('networkVisApp', [
  "ngRoute",
]);

networkVisApp.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
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
