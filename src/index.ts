import { bootstrap } from "./bootstrap";

// the variable declaration is made in assemble/start.js in order
// to make context not available outside LRE
context = bootstrap();
context.setMode("real");
