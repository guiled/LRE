//region LRETest
const lreTestRunner = function () {
    const testSuite = [];
    let promptCmp, promptQuestion, btnYes, btnNo;

    this.run = function (conf) {
        if (arguments.length < 1) {
            conf = {};
        }
        if (!conf.hasOwnProperty('index')) {
            conf.index = 0;
        }
        if (conf.index < 0 || conf.index >= testSuite.length) {
            return;
        }
        hidePrompt();
        if (conf.withPrompt) {
            conf.prompt = prompt.bind(conf);
        } else {
            conf.prompt = passHandler.bind(conf);
        }
        conf.index--;
        gonext.call(conf);
    };

    const gonext = function () {
        this.index++;
        const test = testSuite[this.index];
        test.exec.call(this, test);
    };

    const successHandler = function (test) {
        log('Success for ' + (this.index + 1) + '/' + testSuite.length);
        if (this.index + 1 < testSuite.length) {
            wait(0, gonext.bind(this));
        }
    };

    const failureHandler = function (test, reason) {
        if (arguments.length < 2) {
            reason = 'not specified';
        }
        log('Failure on "' + test.title + '". Reason : ' + reason);
    };

    const passHandler = function () {
        const test = testSuite[this.index]
        log('Pass test ' + (this.index + 1) + '/' + testSuite.length);
        if (test.index + 1 < testSuite.length) {
            wait(0, gonext.bind(this));
        }
    };

    const baseTest = function (test) {
        let callbackCalled = false;
        let result;
        const success = (function () {
            callbackCalled = true;
            successHandler.call(this, test);
        }).bind(this);
        const failure = (function (reason) {
            callbackCalled = true;
            failureHandler.call(this, test, arguments.length > 0 ? reason : 'Unknown reason');
        }).bind(this);
        result = test.cb.call(this, success, failure);
        if (!callbackCalled) {
            return result;
        }
        return null;
    };

    const syncedTest = function (test) {
        let result;
        try {
            result = baseTest.call(this, test);
            if (result !== null && result === false) {
                failureHandler.call(this, test);
            } else {
                successHandler.call(this, test);
            }
        } catch (e) {
            failureHandler.call(this, test, e.toString());
        }
    };

    const addTest = function (title, cb, exec) {
        testSuite.push({
            index: testSuite.length,
            title: title,
            cb: cb,
            exec: exec
        });
    };

    this.flush = function () {
        testSuite = [];
    };

    this.test = function (title, cb) {
        addTest(title, cb, syncedTest);
    };

    this.asyncTest = function (title, cb) {
        addTest(title, cb, baseTest);
    };

    this.setPrompt = function (prompt, label, btnY, btnN) {
        promptCmp = prompt;
        promptQuestion = label;
        btnYes = btnY;
        btnNo = btnN;
    };

    hidePrompt = function () {
        promptCmp.hide();
    };

    const prompt = function (question, onYes, onNo) {
        promptCmp.show();
        promptQuestion.text(question);
        btnNo.on('click', 'btnNo', function () {
            hidePrompt();
            onNo('rejected in prompt');
        });
        btnYes.on('click', 'btnYes', function () {
            hidePrompt();
            onYes();
        });
    };
};

// LRETest
//endregion