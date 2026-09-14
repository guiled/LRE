use swc_core::ecma::ast::*;
use swc_core::ecma::visit::VisitMutWith;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

mod transforms;
mod utils;

use transforms::*;

#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PluginConfig {
    phase: Option<String>,
}

fn parse_config(metadata: &TransformPluginProgramMetadata) -> PluginConfig {
    metadata
        .get_transform_plugin_config()
        .and_then(|raw| serde_json::from_str(raw.as_ref()).ok())
        .unwrap_or_default()
}

fn apply_transform_passes(program: &mut Program) {
    program.visit_mut_with(&mut NoThrow);
    program.visit_mut_with(&mut NoInstanceOf);
    program.visit_mut_with(&mut NoDoWhile);
    program.visit_mut_with(&mut NoArraySpreading);
    program.visit_mut_with(&mut NoObjectSpread);
    program.visit_mut_with(&mut MixinToAssign::new());
    program.visit_mut_with(&mut ParamDefaultValue);
    program.visit_mut_with(&mut NoSpreadArgument);
    program.visit_mut_with(&mut NoRestElement::new());
    program.visit_mut_with(&mut ReplaceInOperator);
    program.visit_mut_with(&mut ComputedObjectProp::new());
    program.visit_mut_with(&mut ClassToFunction::new());
    program.visit_mut_with(&mut NoSpreadArgument);
    program.visit_mut_with(&mut FixArrayFromArguments);
    program.visit_mut_with(&mut CodeAliases);
    program.visit_mut_with(&mut ParamDefaultValue);
    program.visit_mut_with(&mut NoTypeof);
}

fn apply_post_cleanup_passes(program: &mut Program) {
    program.visit_mut_with(&mut NoVoid0);
    program.visit_mut_with(&mut NoTypeof);
    program.visit_mut_with(&mut NoSequence);
    program.visit_mut_with(&mut NoCallInIf::new());
    program.visit_mut_with(&mut FixSpreadApply::new());
}

fn apply_type_of_cleanup_passes(program: &mut Program) {
    program.visit_mut_with(&mut NoTypeof);
}

#[plugin_transform]
pub fn process_transform(
    mut program: Program,
    metadata: TransformPluginProgramMetadata,
) -> Program {
    let config = parse_config(&metadata);

    match config.phase.as_deref() {
        Some("postCleanup") => apply_post_cleanup_passes(&mut program),
        Some("typeOfCleanup") => apply_type_of_cleanup_passes(&mut program),
        _ => apply_transform_passes(&mut program),
    }

    program
}
