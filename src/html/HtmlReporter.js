jasmineRequire.HtmlReporter = function(j$) {

  var noopTimer = {
    start: function() {},
    elapsed: function() { return 0; }
  };

  function HtmlReporter(options) {
    var env = options.env || {},
      getContainer = options.getContainer,
      createElement = options.createElement,
      createTextNode = options.createTextNode,
      onRaiseExceptionsClick = options.onRaiseExceptionsClick || function() {},
      timer = options.timer || noopTimer,
      results = [],
      specsExecuted = 0,
      failureCount = 0,
      pendingSpecCount = 0,
      htmlReporterMain,
      symbols,
      failedSuites = [];

    this.initialize = function() {
      clearPrior();
      htmlReporterMain = createDom('div', {className: 'jasmine_html-reporter'},
        createDom('div', {className: 'banner'},
          createDom('a', {className: 'title', href: 'http://jasmine.github.io/', target: '_blank'}),
          createDom('span', {className: 'version'}, j$.version)
        ),
        createDom('ul', {className: 'symbol-summary'}),
        createDom('div', {className: 'alert'}),
        createDom('div', {className: 'results'},
          createDom('div', {className: 'failures'})
        )
      );
      getContainer().appendChild(htmlReporterMain);

      symbols = find('.symbol-summary');
    };

    var totalSpecsDefined;
    this.jasmineStarted = function(options) {
      totalSpecsDefined = options.totalSpecsDefined || 0;
      timer.start();
    };

    var summary = createDom('div', {className: 'summary'});

    var topResults = new j$.ResultsNode({}, '', null),
      currentParent = topResults;

    this.suiteStarted = function(result) {
      currentParent.addChild(result, 'suite');
      currentParent = currentParent.last();
    };

    this.suiteDone = function(result) {
      if (result.failedExpectations && result.failedExpectations.length > 0) {
        failedSuites.push(result);
      }

      if (currentParent == topResults) {
        return;
      }

      currentParent = currentParent.parent;
    };

    this.specStarted = function(result) {
      currentParent.addChild(result, 'spec');
    };

    var failures = [];
    this.specDone = function(result) {
      if(noExpectations(result) && console && console.error) {
        console.error('Spec \'' + result.fullName + '\' has no expectations.');
      }

      if (result.status != 'disabled') {
        specsExecuted++;
      }

      symbols.appendChild(createDom('li', {
          className: noExpectations(result) ? 'empty' : result.status,
          id: 'spec_' + result.id,
          title: result.fullName
        }
      ));

      if (result.status == 'failed') {
        failureCount++;

        var failure =
          createDom('div', {className: 'spec-detail failed'},
            createDom('div', {className: 'description'},
              createDom('a', {title: result.fullName, href: specHref(result)}, result.fullName)
            ),
            createDom('div', {className: 'messages'})
          );
        var messages = failure.childNodes[1];

        for (var i = 0; i < result.failedExpectations.length; i++) {
          var expectation = result.failedExpectations[i];
          messages.appendChild(createDom('div', {className: 'result-message'}, expectation.message));
          messages.appendChild(createDom('div', {className: 'stack-trace'}, expectation.stack));
        }

        failures.push(failure);
      }

      if (result.status == 'pending') {
        pendingSpecCount++;
      }
    };

    this.jasmineDone = function() {
      var banner = find('.banner');
      banner.appendChild(createDom('span', {className: 'duration'}, 'finished in ' + timer.elapsed() / 1000 + 's'));

      var alert = find('.alert');

      alert.appendChild(createDom('span', { className: 'exceptions' },
        createDom('label', { className: 'label', 'for': 'raise-exceptions' }, 'raise exceptions'),
        createDom('input', {
          className: 'raise',
          id: 'raise-exceptions',
          type: 'checkbox'
        })
      ));
      var checkbox = find('#raise-exceptions');

      checkbox.checked = !env.catchingExceptions();
      checkbox.onclick = onRaiseExceptionsClick;

      if (specsExecuted < totalSpecsDefined) {
        var skippedMessage = 'Ran ' + specsExecuted + ' of ' + totalSpecsDefined + ' specs - run all';
        alert.appendChild(
          createDom('span', {className: 'bar skipped'},
            createDom('a', {href: '?', title: 'Run all specs'}, skippedMessage)
          )
        );
      }
      var statusBarMessage = '';
      var statusBarClassName = 'bar ';

      if (totalSpecsDefined > 0) {
        statusBarMessage += pluralize('spec', specsExecuted) + ', ' + pluralize('failure', failureCount);
        if (pendingSpecCount) { statusBarMessage += ', ' + pluralize('pending spec', pendingSpecCount); }
        statusBarClassName += (failureCount > 0) ? 'failed' : 'passed';
      } else {
        statusBarClassName += 'skipped';
        statusBarMessage += 'No specs found';
      }

      alert.appendChild(createDom('span', {className: statusBarClassName}, statusBarMessage));

      for(i = 0; i < failedSuites.length; i++) {
        var failedSuite = failedSuites[i];
        for(var j = 0; j < failedSuite.failedExpectations.length; j++) {
          var errorBarMessage = 'AfterAll ' + failedSuite.failedExpectations[j].message;
          var errorBarClassName = 'bar errored';
          alert.appendChild(createDom('span', {className: errorBarClassName}, errorBarMessage));
        }
      }

      var results = find('.results');
      results.appendChild(summary);

      summaryList(topResults, summary);

      function summaryList(resultsTree, domParent) {
        var specListNode;
        for (var i = 0; i < resultsTree.children.length; i++) {
          var resultNode = resultsTree.children[i];
          if (resultNode.type == 'suite') {
            var suiteListNode = createDom('ul', {className: 'suite', id: 'suite-' + resultNode.result.id},
              createDom('li', {className: 'suite-detail'},
                createDom('a', {href: specHref(resultNode.result)}, resultNode.result.description)
              )
            );

            summaryList(resultNode, suiteListNode);
            domParent.appendChild(suiteListNode);
          }
          if (resultNode.type == 'spec') {
            if (domParent.getAttribute('class') != 'specs') {
              specListNode = createDom('ul', {className: 'specs'});
              domParent.appendChild(specListNode);
            }
            var specDescription = resultNode.result.description;
            if(noExpectations(resultNode.result)) {
              specDescription = 'SPEC HAS NO EXPECTATIONS ' + specDescription;
            }
            specListNode.appendChild(
              createDom('li', {
                  className: resultNode.result.status,
                  id: 'spec-' + resultNode.result.id
                },
                createDom('a', {href: specHref(resultNode.result)}, specDescription)
              )
            );
          }
        }
      }

      if (failures.length) {
        alert.appendChild(
          createDom('span', {className: 'menu bar spec-list'},
            createDom('span', {}, 'Spec List | '),
            createDom('a', {className: 'failures-menu', href: '#'}, 'Failures')));
        alert.appendChild(
          createDom('span', {className: 'menu bar failure-list'},
            createDom('a', {className: 'spec-list-menu', href: '#'}, 'Spec List'),
            createDom('span', {}, ' | Failures ')));

        find('.failures-menu').onclick = function() {
          setMenuModeTo('failure-list');
        };
        find('.spec-list-menu').onclick = function() {
          setMenuModeTo('spec-list');
        };

        setMenuModeTo('failure-list');

        var failureNode = find('.failures');
        for (var i = 0; i < failures.length; i++) {
          failureNode.appendChild(failures[i]);
        }
      }
    };

    return this;

    function find(selector) {
      return getContainer().querySelector('.jasmine_html-reporter ' + selector);
    }

    function clearPrior() {
      // return the reporter
      var oldReporter = find('');
      
      if(oldReporter) {
        getContainer().removeChild(oldReporter);
      }
    }

    function createDom(type, attrs, childrenVarArgs) {
      var el = createElement(type);

      for (var i = 2; i < arguments.length; i++) {
        var child = arguments[i];

        if (typeof child === 'string') {
          el.appendChild(createTextNode(child));
        } else {
          if (child) {
            el.appendChild(child);
          }
        }
      }

      for (var attr in attrs) {
        if (attr == 'className') {
          el[attr] = attrs[attr];
        } else {
          el.setAttribute(attr, attrs[attr]);
        }
      }

      return el;
    }

    function pluralize(singular, count) {
      var word = (count == 1 ? singular : singular + 's');

      return '' + count + ' ' + word;
    }

    function specHref(result) {
      return '?spec=' + encodeURIComponent(result.fullName);
    }

    function setMenuModeTo(mode) {
      htmlReporterMain.setAttribute('class', 'jasmine_html-reporter ' + mode);
    }

    function noExpectations(result) {
      return (result.failedExpectations.length + result.passedExpectations.length) === 0 &&
        result.status === 'passed';
    }
  }

  return HtmlReporter;
};
