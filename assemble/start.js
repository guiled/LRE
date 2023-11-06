
    let errExclFirstLine, errExclLastLine;
    try { let a = null; a() } catch (e) { errExclFirstLine = e.trace[0].loc.start.line };

    function instanceOf(a, b) {
        return a instanceof b;
    }
