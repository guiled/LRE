    try { let a = null; a() } catch (e) { errExclLastLine = e.trace[0].loc.start.line };
