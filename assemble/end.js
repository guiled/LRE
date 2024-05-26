    try { let a42 = null; a42() } catch (e) { errExclLastLine = e.trace[0].loc.start.line };
