
    let context;
    let errExclFirstLine, errExclLastLine;
    try { let a42 = null; a42() } catch (e) { errExclFirstLine = e.trace[0].loc.start.line };

    function instanceOf(a, b) {
        return a instanceof b;
    }
