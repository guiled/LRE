use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

pub struct UnwrapBlockStmt;

impl VisitMut for UnwrapBlockStmt {
    fn visit_mut_stmts(&mut self, stmts: &mut Vec<Stmt>) {
        for stmt in stmts.iter_mut() {
            stmt.visit_mut_with(self);
        }
        flatten_redundant_blocks(stmts);
    }

    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        block.stmts.visit_mut_with(self);
        flatten_redundant_blocks(&mut block.stmts);
    }
}

fn flatten_redundant_blocks(stmts: &mut Vec<Stmt>) {
    loop {
        let mut changed = false;
        let mut index = 0;

        while index < stmts.len() {
            let Stmt::Block(inner) = &stmts[index] else {
                index += 1;
                continue;
            };

            if !can_unwrap_block(inner) {
                index += 1;
                continue;
            }

            let inner_stmts = stmts.remove(index);
            let Stmt::Block(inner) = inner_stmts else {
                unreachable!("checked Block variant above");
            };

            for (offset, stmt) in inner.stmts.into_iter().enumerate() {
                stmts.insert(index + offset, stmt);
            }

            changed = true;
        }

        if !changed {
            break;
        }
    }
}

fn can_unwrap_block(block: &BlockStmt) -> bool {
    if block
        .stmts
        .iter()
        .any(|stmt| matches!(stmt, Stmt::Decl(Decl::Fn(_) | Decl::Class(_))))
    {
        return false;
    }

    let has_var = block
        .stmts
        .iter()
        .any(|stmt| matches!(stmt, Stmt::Decl(Decl::Var(_))));

    if !has_var {
        return true;
    }

    is_no_call_in_if_block(&block.stmts)
}

fn is_no_call_in_if_block(stmts: &[Stmt]) -> bool {
    if stmts.len() != 2 {
        return false;
    }

    let decl_name = match &stmts[0] {
        Stmt::Decl(Decl::Var(var)) => match var.decls.first() {
            Some(VarDeclarator {
                name: Pat::Ident(binding),
                ..
            }) => binding.id.sym.as_ref(),
            _ => return false,
        },
        _ => return false,
    };

    if decl_name != "_c" {
        return false;
    }

    let Stmt::If(if_stmt) = &stmts[1] else {
        return false;
    };

    matches!(if_stmt.test.as_ref(), Expr::Ident(id) if id.sym == *"_c")
}

#[cfg(test)]
mod tests {
    use swc_core::common::GLOBALS;
    use swc_core::common::{FileName, SourceMap, sync::Lrc, Mark};
    use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
    use swc_core::ecma::parser::{Parser, StringInput, Syntax, TsSyntax};
    use swc_core::ecma::visit::VisitMutWith;

    use super::UnwrapBlockStmt;
    use crate::transforms::NoCallInIf;

    fn apply_post_cleanup(input: &str) -> String {
        GLOBALS.set(&Default::default(), || {
            let cm = Lrc::new(SourceMap::default());
            let fm = cm.new_source_file(FileName::Anon.into(), input.to_string());
            let mut program = Parser::new(
                Syntax::Typescript(TsSyntax {
                    tsx: false,
                    ..Default::default()
                }),
                StringInput::from(&*fm),
                None,
            )
            .parse_program()
            .expect("failed to parse");

            let unresolved_mark = Mark::new();
            let top_level_mark = Mark::new();
            program.visit_mut_with(&mut swc_core::ecma::transforms::base::resolver(
                unresolved_mark,
                top_level_mark,
                false,
            ));
            program.visit_mut_with(&mut NoCallInIf::new());
            program.visit_mut_with(&mut UnwrapBlockStmt);

            let mut buf = vec![];
            {
                let writer = JsWriter::new(cm.clone(), "\n", &mut buf, None);
                let mut emitter = Emitter {
                    cfg: swc_core::ecma::codegen::Config::default(),
                    cm: cm.clone(),
                    comments: None,
                    wr: writer,
                };
                emitter.emit_program(&program).expect("failed to emit");
            }

            String::from_utf8(buf).expect("invalid utf8")
        })
    }

    #[test]
    fn unwraps_no_call_in_if_block() {
        let output = apply_post_cleanup(
            "function fixture() { if (!lre.isObject(rowLeft)) { result[keyLeft] = rowLeft; return; } }",
        );

        assert!(!output.contains("{ const _c"));
        assert!(!output.contains("{ var _c"));
        assert!(output.contains("_c = !lre.isObject(rowLeft)"));
        assert!(output.contains("if (_c)"));
    }

    #[test]
    fn unwraps_redundant_sequence_block() {
        let output = apply_post_cleanup("function fixture() { { __raw.floor(); return this; } }");

        assert!(!output.contains("{ __raw.floor()"));
        assert!(output.contains("__raw.floor();"));
        assert!(output.contains("return this;"));
    }
}
