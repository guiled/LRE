import {
  Accessibility,
  Argument,
  ArrayExpression,
  ArrayPattern,
  ArrowFunctionExpression,
  AssignmentExpression,
  AssignmentPattern,
  AssignmentPatternProperty,
  AssignmentProperty,
  AwaitExpression,
  BigIntLiteral,
  BinaryExpression,
  BlockStatement,
  BooleanLiteral,
  BreakStatement,
  CallExpression,
  CatchClause,
  Class,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  ClassMethod,
  ClassProperty,
  ComputedPropName,
  ConditionalExpression,
  Constructor,
  ContinueStatement,
  DebuggerStatement,
  Declaration,
  Decorator,
  DefaultDecl,
  DoWhileStatement,
  EmptyStatement,
  ExportAllDeclaration,
  ExportDeclaration,
  ExportDefaultDeclaration,
  ExportDefaultExpression,
  ExportDefaultSpecifier,
  ExportNamedDeclaration,
  ExportNamespaceSpecifier,
  ExportSpecifier,
  Expression,
  ExpressionStatement,
  ExprOrSpread,
  Fn,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  GetterProperty,
  Identifier,
  IfStatement,
  Import,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  JSXAttribute,
  JSXAttributeName,
  JSXAttributeOrSpread,
  JSXAttrValue,
  JSXClosingElement,
  JSXClosingFragment,
  JSXElement,
  JSXElementChild,
  JSXElementName,
  JSXEmptyExpression,
  JSXExpressionContainer,
  JSXFragment,
  JSXMemberExpression,
  JSXNamespacedName,
  JSXObject,
  JSXOpeningElement,
  JSXOpeningFragment,
  JSXSpreadChild,
  JSXText,
  KeyValuePatternProperty,
  KeyValueProperty,
  LabeledStatement,
  MemberExpression,
  MetaProperty,
  MethodProperty,
  Module,
  ModuleDeclaration,
  ModuleExportName,
  ModuleItem,
  NamedExportSpecifier,
  NamedImportSpecifier,
  NewExpression,
  NullLiteral,
  NumericLiteral,
  ObjectExpression,
  ObjectPattern,
  ObjectPatternProperty,
  OptionalChainingCall,
  OptionalChainingExpression,
  Param,
  ParenthesisExpression,
  Pattern,
  PrivateMethod,
  PrivateName,
  PrivateProperty,
  Program,
  Property,
  PropertyName,
  RegExpLiteral,
  RestElement,
  ReturnStatement,
  Script,
  SequenceExpression,
  SetterProperty,
  SpreadElement,
  Statement,
  StaticBlock,
  StringLiteral,
  Super,
  SuperPropExpression,
  SwitchCase,
  SwitchStatement,
  TaggedTemplateExpression,
  TemplateLiteral,
  ThisExpression,
  ThrowStatement,
  TryStatement,
  TsAsExpression,
  TsCallSignatureDeclaration,
  TsConstAssertion,
  TsConstructSignatureDeclaration,
  TsEntityName,
  TsEnumDeclaration,
  TsEnumMember,
  TsEnumMemberId,
  TsExportAssignment,
  TsExpressionWithTypeArguments,
  TsExternalModuleReference,
  TsFnParameter,
  TsGetterSignature,
  TsImportEqualsDeclaration,
  TsIndexSignature,
  TsInstantiation,
  TsInterfaceBody,
  TsInterfaceDeclaration,
  TsMethodSignature,
  TsModuleBlock,
  TsModuleDeclaration,
  TsModuleName,
  TsModuleReference,
  TsNamespaceBody,
  TsNamespaceDeclaration,
  TsNamespaceExportDeclaration,
  TsNonNullExpression,
  TsParameterProperty,
  TsParameterPropertyParameter,
  TsPropertySignature,
  TsQualifiedName,
  TsSetterSignature,
  TsType,
  TsTypeAliasDeclaration,
  TsTypeAnnotation,
  TsTypeAssertion,
  TsTypeElement,
  TsTypeParameter,
  TsTypeParameterDeclaration,
  TsTypeParameterInstantiation,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
  WithStatement,
  YieldExpression,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";

class DefaultVisitor extends Visitor {
  visitProgram(n: Program): Program {
    console.log("visitProgram");
    return super.visitProgram(n);
  }
  visitModule(m: Module): Module {
    console.log("visitModule");
    return super.visitModule(m);
  }
  visitScript(m: Script): Script {
    console.log("visitScript");
    return super.visitScript(m);
  }
  visitModuleItems(items: ModuleItem[]): ModuleItem[] {
    console.log("visitModuleItems");
    return super.visitModuleItems(items);
  }
  visitModuleItem(n: ModuleItem): ModuleItem {
    console.log("visitModuleItem");
    return super.visitModuleItem(n);
  }
  visitModuleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
    console.log("visitModuleDeclaration");
    return super.visitModuleDeclaration(n);
  }
  visitTsNamespaceExportDeclaration(
    n: TsNamespaceExportDeclaration,
  ): ModuleDeclaration {
    console.log("visitTsNamespaceExportDeclaration");
    return super.visitTsNamespaceExportDeclaration(n);
  }
  visitTsExportAssignment(n: TsExportAssignment): TsExportAssignment {
    console.log("visitTsExportAssignment");
    return super.visitTsExportAssignment(n);
  }
  visitTsImportEqualsDeclaration(
    n: TsImportEqualsDeclaration,
  ): ModuleDeclaration {
    console.log("visitTsImportEqualsDeclaration");
    return super.visitTsImportEqualsDeclaration(n);
  }
  visitTsModuleReference(n: TsModuleReference): TsModuleReference {
    console.log("visitTsModuleReference");
    return super.visitTsModuleReference(n);
  }
  visitTsExternalModuleReference(
    n: TsExternalModuleReference,
  ): TsExternalModuleReference {
    console.log("visitTsExternalModuleReference");
    return super.visitTsExternalModuleReference(n);
  }
  visitExportAllDeclaration(n: ExportAllDeclaration): ModuleDeclaration {
    console.log("visitExportAllDeclaration");
    return super.visitExportAllDeclaration(n);
  }
  visitExportDefaultExpression(n: ExportDefaultExpression): ModuleDeclaration {
    console.log("visitExportDefaultExpression");
    return super.visitExportDefaultExpression(n);
  }
  visitExportNamedDeclaration(n: ExportNamedDeclaration): ModuleDeclaration {
    console.log("visitExportNamedDeclaration");
    return super.visitExportNamedDeclaration(n);
  }
  visitExportSpecifiers(nodes: ExportSpecifier[]): ExportSpecifier[] {
    console.log("visitExportSpecifiers");
    return super.visitExportSpecifiers(nodes);
  }
  visitExportSpecifier(n: ExportSpecifier): ExportSpecifier {
    console.log("visitExportSpecifier");
    return super.visitExportSpecifier(n);
  }
  visitNamedExportSpecifier(n: NamedExportSpecifier): ExportSpecifier {
    console.log("visitNamedExportSpecifier");
    return super.visitNamedExportSpecifier(n);
  }
  visitModuleExportName(n: ModuleExportName): ModuleExportName {
    console.log("visitModuleExportName");
    return super.visitModuleExportName(n);
  }
  visitExportNamespaceSpecifier(n: ExportNamespaceSpecifier): ExportSpecifier {
    console.log("visitExportNamespaceSpecifier");
    return super.visitExportNamespaceSpecifier(n);
  }
  visitExportDefaultSpecifier(n: ExportDefaultSpecifier): ExportSpecifier {
    console.log("visitExportDefaultSpecifier");
    return super.visitExportDefaultSpecifier(n);
  }
  visitOptionalStringLiteral(
    n: StringLiteral | undefined,
  ): StringLiteral | undefined {
    console.log("visitOptionalStringLiteral");
    return super.visitOptionalStringLiteral(n);
  }
  visitExportDefaultDeclaration(
    n: ExportDefaultDeclaration,
  ): ModuleDeclaration {
    console.log("visitExportDefaultDeclaration");
    return super.visitExportDefaultDeclaration(n);
  }
  visitDefaultDeclaration(n: DefaultDecl): DefaultDecl {
    console.log("visitDefaultDeclaration");
    return super.visitDefaultDeclaration(n);
  }
  visitFunctionExpression(n: FunctionExpression): FunctionExpression {
    console.log("visitFunctionExpression");
    return super.visitFunctionExpression(n);
  }
  visitClassExpression(n: ClassExpression): ClassExpression {
    console.log("visitClassExpression", n.identifier?.value);
    return super.visitClassExpression(n);
  }
  visitExportDeclaration(n: ExportDeclaration): ModuleDeclaration {
    console.log("visitExportDeclaration");
    return super.visitExportDeclaration(n);
  }
  visitArrayExpression(e: ArrayExpression): Expression {
    console.log("visitArrayExpression");
    return super.visitArrayExpression(e);
  }
  visitArrayElement(e: ExprOrSpread | undefined): ExprOrSpread | undefined {
    console.log("visitArrayElement");
    return super.visitArrayElement(e);
  }
  visitExprOrSpread(e: ExprOrSpread): ExprOrSpread {
    console.log("visitExprOrSpread");
    return super.visitExprOrSpread(e);
  }
  visitExprOrSpreads(nodes: ExprOrSpread[]): ExprOrSpread[] {
    console.log("visitExprOrSpreads");
    return super.visitExprOrSpreads(nodes);
  }
  visitSpreadElement(e: SpreadElement): SpreadElement {
    console.log("visitSpreadElement");
    return super.visitSpreadElement(e);
  }
  visitOptionalExpression(e: Expression | undefined): Expression | undefined {
    console.log("visitOptionalExpression");
    return super.visitOptionalExpression(e);
  }
  visitArrowFunctionExpression(e: ArrowFunctionExpression): Expression {
    console.log("visitArrowFunctionExpression");
    return super.visitArrowFunctionExpression(e);
  }
  visitArrowBody(
    body: BlockStatement | Expression,
  ): BlockStatement | Expression {
    console.log("visitArrowBody");
    return super.visitArrowBody(body);
  }
  visitBlockStatement(block: BlockStatement): BlockStatement {
    console.log("visitBlockStatement");
    return super.visitBlockStatement(block);
  }
  visitStatements(stmts: Statement[]): Statement[] {
    console.log("visitStatements");
    return super.visitStatements(stmts);
  }
  visitStatement(stmt: Statement): Statement {
    console.log("visitStatement");
    return super.visitStatement(stmt);
  }
  visitSwitchStatement(stmt: SwitchStatement): Statement {
    console.log("visitSwitchStatement");
    return super.visitSwitchStatement(stmt);
  }
  visitSwitchCases(cases: SwitchCase[]): SwitchCase[] {
    console.log("visitSwitchCases");
    return super.visitSwitchCases(cases);
  }
  visitSwitchCase(c: SwitchCase): SwitchCase {
    console.log("visitSwitchCase");
    return super.visitSwitchCase(c);
  }
  visitIfStatement(stmt: IfStatement): Statement {
    console.log("visitIfStatement");
    return super.visitIfStatement(stmt);
  }
  visitOptionalStatement(stmt: Statement | undefined): Statement | undefined {
    console.log("visitOptionalStatement");
    return super.visitOptionalStatement(stmt);
  }
  visitBreakStatement(stmt: BreakStatement): Statement {
    console.log("visitBreakStatement");
    return super.visitBreakStatement(stmt);
  }
  visitWhileStatement(stmt: WhileStatement): Statement {
    console.log("visitWhileStatement");
    return super.visitWhileStatement(stmt);
  }
  visitTryStatement(stmt: TryStatement): Statement {
    console.log("visitTryStatement");
    return super.visitTryStatement(stmt);
  }
  visitCatchClause(handler: CatchClause | undefined): CatchClause | undefined {
    console.log("visitCatchClause");
    return super.visitCatchClause(handler);
  }
  visitThrowStatement(stmt: ThrowStatement): Statement {
    console.log("visitThrowStatement");
    return super.visitThrowStatement(stmt);
  }
  visitReturnStatement(stmt: ReturnStatement): Statement {
    console.log("visitReturnStatement");
    return super.visitReturnStatement(stmt);
  }
  visitLabeledStatement(stmt: LabeledStatement): Statement {
    console.log("visitLabeledStatement");
    return super.visitLabeledStatement(stmt);
  }
  visitForStatement(stmt: ForStatement): Statement {
    console.log("visitForStatement");
    return super.visitForStatement(stmt);
  }
  visitForOfStatement(stmt: ForOfStatement): Statement {
    console.log("visitForOfStatement");
    return super.visitForOfStatement(stmt);
  }
  visitForInStatement(stmt: ForInStatement): Statement {
    console.log("visitForInStatement");
    return super.visitForInStatement(stmt);
  }
  visitEmptyStatement(stmt: EmptyStatement): EmptyStatement {
    console.log("visitEmptyStatement");
    return super.visitEmptyStatement(stmt);
  }
  visitDoWhileStatement(stmt: DoWhileStatement): Statement {
    console.log("visitDoWhileStatement");
    return super.visitDoWhileStatement(stmt);
  }
  visitDebuggerStatement(stmt: DebuggerStatement): Statement {
    console.log("visitDebuggerStatement");
    return super.visitDebuggerStatement(stmt);
  }
  visitWithStatement(stmt: WithStatement): Statement {
    console.log("visitWithStatement");
    return super.visitWithStatement(stmt);
  }
  visitDeclaration(decl: Declaration): Declaration {
    console.log("visitDeclaration");
    return super.visitDeclaration(decl);
  }
  visitVariableDeclaration(n: VariableDeclaration): VariableDeclaration {
    console.log("visitVariableDeclaration");
    return super.visitVariableDeclaration(n);
  }
  visitVariableDeclarators(nodes: VariableDeclarator[]): VariableDeclarator[] {
    console.log("visitVariableDeclarators");
    return super.visitVariableDeclarators(nodes);
  }
  visitVariableDeclarator(n: VariableDeclarator): VariableDeclarator {
    console.log("visitVariableDeclarator");
    return super.visitVariableDeclarator(n);
  }
  visitTsTypeAliasDeclaration(n: TsTypeAliasDeclaration): Declaration {
    console.log("visitTsTypeAliasDeclaration");
    return super.visitTsTypeAliasDeclaration(n);
  }
  visitTsModuleDeclaration(n: TsModuleDeclaration): Declaration {
    console.log("visitTsModuleDeclaration");
    return super.visitTsModuleDeclaration(n);
  }
  visitTsModuleName(n: TsModuleName): TsModuleName {
    console.log("visitTsModuleName");
    return super.visitTsModuleName(n);
  }
  visitTsNamespaceBody(n: TsNamespaceBody): TsNamespaceBody | undefined {
    console.log("visitTsNamespaceBody");
    return super.visitTsNamespaceBody(n);
  }
  visitTsNamespaceDeclaration(
    n: TsNamespaceDeclaration,
  ): TsModuleBlock | TsNamespaceDeclaration {
    console.log("visitTsNamespaceDeclaration");
    return super.visitTsNamespaceDeclaration(n);
  }
  visitTsModuleBlock(n: TsModuleBlock): TsModuleBlock | TsNamespaceDeclaration {
    console.log("visitTsModuleBlock");
    return super.visitTsModuleBlock(n);
  }
  visitTsInterfaceDeclaration(
    n: TsInterfaceDeclaration,
  ): TsInterfaceDeclaration {
    console.log("visitTsInterfaceDeclaration");
    return super.visitTsInterfaceDeclaration(n);
  }
  visitTsInterfaceBody(n: TsInterfaceBody): TsInterfaceBody {
    console.log("visitTsInterfaceBody");
    return super.visitTsInterfaceBody(n);
  }
  visitTsTypeElements(nodes: TsTypeElement[]): TsTypeElement[] {
    console.log("visitTsTypeElements");
    return super.visitTsTypeElements(nodes);
  }
  visitTsTypeElement(n: TsTypeElement): TsTypeElement {
    console.log("visitTsTypeElement");
    return super.visitTsTypeElement(n);
  }
  visitTsCallSignatureDeclaration(
    n: TsCallSignatureDeclaration,
  ): TsCallSignatureDeclaration {
    console.log("visitTsCallSignatureDeclaration");
    return super.visitTsCallSignatureDeclaration(n);
  }
  visitTsConstructSignatureDeclaration(
    n: TsConstructSignatureDeclaration,
  ): TsConstructSignatureDeclaration {
    console.log("visitTsConstructSignatureDeclaration");
    return super.visitTsConstructSignatureDeclaration(n);
  }
  visitTsPropertySignature(n: TsPropertySignature): TsPropertySignature {
    console.log("visitTsPropertySignature");
    return super.visitTsPropertySignature(n);
  }
  visitTsGetterSignature(n: TsGetterSignature): TsGetterSignature {
    console.log("visitTsGetterSignature");
    return super.visitTsGetterSignature(n);
  }
  visitTsSetterSignature(n: TsSetterSignature): TsSetterSignature {
    console.log("visitTsSetterSignature");
    return super.visitTsSetterSignature(n);
  }
  visitTsMethodSignature(n: TsMethodSignature): TsMethodSignature {
    console.log("visitTsMethodSignature");
    return super.visitTsMethodSignature(n);
  }
  visitTsEnumDeclaration(n: TsEnumDeclaration): Declaration {
    console.log("visitTsEnumDeclaration");
    return super.visitTsEnumDeclaration(n);
  }
  visitTsEnumMembers(nodes: TsEnumMember[]): TsEnumMember[] {
    console.log("visitTsEnumMembers");
    return super.visitTsEnumMembers(nodes);
  }
  visitTsEnumMember(n: TsEnumMember): TsEnumMember {
    console.log("visitTsEnumMember");
    return super.visitTsEnumMember(n);
  }
  visitTsEnumMemberId(n: TsEnumMemberId): TsEnumMemberId {
    console.log("visitTsEnumMemberId");
    return super.visitTsEnumMemberId(n);
  }
  visitFunctionDeclaration(decl: FunctionDeclaration): Declaration {
    console.log("visitFunctionDeclaration");
    return super.visitFunctionDeclaration(decl);
  }
  visitClassDeclaration(decl: ClassDeclaration): Declaration {
    console.log("visitClassDeclaration", decl.identifier.value);
    return super.visitClassDeclaration(decl);
  }
  visitClassBody(members: ClassMember[]): ClassMember[] {
    console.log("visitClassBody");
    return super.visitClassBody(members);
  }
  visitClassMember(member: ClassMember): ClassMember {
    console.log("visitClassMember");
    return super.visitClassMember(member);
  }
  visitTsIndexSignature(n: TsIndexSignature): TsIndexSignature {
    console.log("visitTsIndexSignature");
    return super.visitTsIndexSignature(n);
  }
  visitTsFnParameters(params: TsFnParameter[]): TsFnParameter[] {
    console.log("visitTsFnParameters");
    return super.visitTsFnParameters(params);
  }
  visitTsFnParameter(n: TsFnParameter): TsFnParameter {
    console.log("visitTsFnParameter");
    return super.visitTsFnParameter(n);
  }
  visitPrivateProperty(n: PrivateProperty): ClassMember {
    console.log("visitPrivateProperty");
    return super.visitPrivateProperty(n);
  }
  visitPrivateMethod(n: PrivateMethod): ClassMember {
    console.log("visitPrivateMethod");
    return super.visitPrivateMethod(n);
  }
  visitPrivateName(n: PrivateName): PrivateName {
    console.log("visitPrivateName");
    return super.visitPrivateName(n);
  }
  visitConstructor(n: Constructor): ClassMember {
    console.log("visitConstructor");
    return super.visitConstructor(n);
  }
  visitConstructorParameters(
    nodes: (Param | TsParameterProperty)[],
  ): (Param | TsParameterProperty)[] {
    console.log("visitConstructorParameters");
    return super.visitConstructorParameters(nodes);
  }
  visitConstructorParameter(
    n: Param | TsParameterProperty,
  ): Param | TsParameterProperty {
    console.log("visitConstructorParameter");
    return super.visitConstructorParameter(n);
  }
  visitStaticBlock(n: StaticBlock): StaticBlock {
    console.log("visitStaticBlock");
    return super.visitStaticBlock(n);
  }
  visitTsParameterProperty(
    n: TsParameterProperty,
  ): TsParameterProperty | Param {
    console.log("visitTsParameterProperty");
    return super.visitTsParameterProperty(n);
  }
  visitTsParameterPropertyParameter(
    n: TsParameterPropertyParameter,
  ): TsParameterPropertyParameter {
    console.log("visitTsParameterPropertyParameter");
    return super.visitTsParameterPropertyParameter(n);
  }
  visitPropertyName(key: PropertyName): PropertyName {
    console.log("visitPropertyName");
    return super.visitPropertyName(key);
  }
  visitAccessibility(n: Accessibility | undefined): Accessibility | undefined {
    console.log("visitAccessibility");
    return super.visitAccessibility(n);
  }
  visitClassProperty(n: ClassProperty): ClassMember {
    console.log("visitClassProperty");
    return super.visitClassProperty(n);
  }
  visitClassMethod(n: ClassMethod): ClassMember {
    console.log("visitClassMethod");
    return super.visitClassMethod(n);
  }
  visitComputedPropertyKey(n: ComputedPropName): ComputedPropName {
    console.log("visitComputedPropertyKey");
    return super.visitComputedPropertyKey(n);
  }
  visitClass<T extends Class>(n: T): T {
    console.log("visitClass");
    return super.visitClass(n);
  }
  visitFunction<T extends Fn>(n: T): T {
    console.log("visitFunction");
    return super.visitFunction(n);
  }
  visitTsExpressionsWithTypeArguments(
    nodes: TsExpressionWithTypeArguments[],
  ): TsExpressionWithTypeArguments[] {
    console.log("visitTsExpressionsWithTypeArguments");
    return super.visitTsExpressionsWithTypeArguments(nodes);
  }
  visitTsExpressionWithTypeArguments(
    n: TsExpressionWithTypeArguments,
  ): TsExpressionWithTypeArguments {
    console.log("visitTsExpressionWithTypeArguments");
    return super.visitTsExpressionWithTypeArguments(n);
  }
  visitTsTypeParameterInstantiation(
    n: TsTypeParameterInstantiation | undefined,
  ): TsTypeParameterInstantiation | undefined {
    console.log("visitTsTypeParameterInstantiation");
    return super.visitTsTypeParameterInstantiation(n);
  }
  visitTsTypes(nodes: TsType[]): TsType[] {
    console.log("visitTsTypes");
    return super.visitTsTypes(nodes);
  }
  visitTsEntityName(n: TsEntityName): TsEntityName {
    console.log("visitTsEntityName");
    return super.visitTsEntityName(n);
  }
  visitTsQualifiedName(n: TsQualifiedName): TsQualifiedName {
    console.log("visitTsQualifiedName");
    return super.visitTsQualifiedName(n);
  }
  visitDecorators(nodes: Decorator[] | undefined): Decorator[] | undefined {
    console.log("visitDecorators");
    return super.visitDecorators(nodes);
  }
  visitDecorator(n: Decorator): Decorator {
    console.log("visitDecorator");
    return super.visitDecorator(n);
  }
  visitExpressionStatement(stmt: ExpressionStatement): Statement {
    console.log("visitExpressionStatement");
    return super.visitExpressionStatement(stmt);
  }
  visitContinueStatement(stmt: ContinueStatement): Statement {
    console.log("visitContinueStatement");
    return super.visitContinueStatement(stmt);
  }
  visitExpression(n: Expression): Expression {
    console.log("visitExpression");
    return super.visitExpression(n);
  }
  visitOptionalChainingExpression(n: OptionalChainingExpression): Expression {
    console.log("visitOptionalChainingExpression");
    return super.visitOptionalChainingExpression(n);
  }
  visitMemberExpressionOrOptionalChainingCall(
    n: MemberExpression | OptionalChainingCall,
  ): MemberExpression | OptionalChainingCall {
    console.log("visitMemberExpressionOrOptionalChainingCall");
    return super.visitMemberExpressionOrOptionalChainingCall(n);
  }
  visitOptionalChainingCall(n: OptionalChainingCall): OptionalChainingCall {
    console.log("visitOptionalChainingCall");
    return super.visitOptionalChainingCall(n);
  }
  visitAssignmentExpression(n: AssignmentExpression): Expression {
    console.log("visitAssignmentExpression");
    return super.visitAssignmentExpression(n);
  }
  visitPatternOrExpression(n: Pattern | Expression): Pattern | Expression {
    console.log("visitPatternOrExpression");
    return super.visitPatternOrExpression(n);
  }
  visitYieldExpression(n: YieldExpression): Expression {
    console.log("visitYieldExpression");
    return super.visitYieldExpression(n);
  }
  visitUpdateExpression(n: UpdateExpression): Expression {
    console.log("visitUpdateExpression");
    return super.visitUpdateExpression(n);
  }
  visitUnaryExpression(n: UnaryExpression): Expression {
    console.log("visitUnaryExpression");
    return super.visitUnaryExpression(n);
  }
  visitTsTypeAssertion(n: TsTypeAssertion): Expression {
    console.log("visitTsTypeAssertion");
    return super.visitTsTypeAssertion(n);
  }
  visitTsConstAssertion(n: TsConstAssertion): Expression {
    console.log("visitTsConstAssertion");
    return super.visitTsConstAssertion(n);
  }
  visitTsInstantiation(n: TsInstantiation): TsInstantiation {
    console.log("visitTsInstantiation");
    return super.visitTsInstantiation(n);
  }
  visitTsNonNullExpression(n: TsNonNullExpression): Expression {
    console.log("visitTsNonNullExpression");
    return super.visitTsNonNullExpression(n);
  }
  visitTsAsExpression(n: TsAsExpression): Expression {
    console.log("visitTsAsExpression");
    return super.visitTsAsExpression(n);
  }
  visitThisExpression(n: ThisExpression): Expression {
    console.log("visitThisExpression");
    return super.visitThisExpression(n);
  }
  visitTemplateLiteral(n: TemplateLiteral): Expression {
    console.log("visitTemplateLiteral");
    return super.visitTemplateLiteral(n);
  }
  visitParameters(n: Param[]): Param[] {
    console.log("visitParameters");
    return super.visitParameters(n);
  }
  visitParameter(n: Param): Param {
    console.log("visitParameter");
    return super.visitParameter(n);
  }
  visitTaggedTemplateExpression(n: TaggedTemplateExpression): Expression {
    console.log("visitTaggedTemplateExpression");
    return super.visitTaggedTemplateExpression(n);
  }
  visitSequenceExpression(n: SequenceExpression): Expression {
    console.log("visitSequenceExpression");
    return super.visitSequenceExpression(n);
  }
  visitRegExpLiteral(n: RegExpLiteral): Expression {
    console.log("visitRegExpLiteral");
    return super.visitRegExpLiteral(n);
  }
  visitParenthesisExpression(n: ParenthesisExpression): Expression {
    console.log("visitParenthesisExpression");
    return super.visitParenthesisExpression(n);
  }
  visitObjectExpression(n: ObjectExpression): Expression {
    console.log("visitObjectExpression");
    return super.visitObjectExpression(n);
  }
  visitObjectProperties(
    nodes: (Property | SpreadElement)[],
  ): (Property | SpreadElement)[] {
    console.log("visitObjectProperties");
    return super.visitObjectProperties(nodes);
  }
  visitObjectProperty(n: Property | SpreadElement): Property | SpreadElement {
    console.log("visitObjectProperty");
    return super.visitObjectProperty(n);
  }
  visitProperty(n: Property): Property | SpreadElement {
    console.log("visitProperty");
    return super.visitProperty(n);
  }
  visitSetterProperty(n: SetterProperty): Property | SpreadElement {
    console.log("visitSetterProperty");
    return super.visitSetterProperty(n);
  }
  visitMethodProperty(n: MethodProperty): Property | SpreadElement {
    console.log("visitMethodProperty");
    return super.visitMethodProperty(n);
  }
  visitKeyValueProperty(n: KeyValueProperty): Property | SpreadElement {
    console.log("visitKeyValueProperty");
    return super.visitKeyValueProperty(n);
  }
  visitGetterProperty(n: GetterProperty): Property | SpreadElement {
    console.log("visitGetterProperty");
    return super.visitGetterProperty(n);
  }
  visitAssignmentProperty(n: AssignmentProperty): Property | SpreadElement {
    console.log("visitAssignmentProperty");
    return super.visitAssignmentProperty(n);
  }
  visitNullLiteral(n: NullLiteral): NullLiteral {
    console.log("visitNullLiteral");
    return super.visitNullLiteral(n);
  }
  visitNewExpression(n: NewExpression): Expression {
    console.log("visitNewExpression");
    return super.visitNewExpression(n);
  }
  visitTsTypeArguments(
    n: TsTypeParameterInstantiation | undefined,
  ): TsTypeParameterInstantiation | undefined {
    console.log("visitTsTypeArguments");
    return super.visitTsTypeArguments(n);
  }
  visitArguments(nodes: Argument[]): Argument[] {
    console.log("visitArguments");
    return super.visitArguments(nodes);
  }
  visitArgument(n: Argument): Argument {
    console.log("visitArgument");
    return super.visitArgument(n);
  }
  visitMetaProperty(n: MetaProperty): Expression {
    console.log("visitMetaProperty");
    return super.visitMetaProperty(n);
  }
  visitMemberExpression(n: MemberExpression): MemberExpression {
    console.log("visitMemberExpression");
    return super.visitMemberExpression(n);
  }
  visitSuperPropExpression(n: SuperPropExpression): Expression {
    console.log("visitSuperPropExpression");
    return super.visitSuperPropExpression(n);
  }
  visitCallee(n: Expression | Super | Import): Expression | Super | Import {
    console.log("visitCallee");
    return super.visitCallee(n);
  }
  visitJSXText(n: JSXText): JSXText {
    console.log("visitJSXText");
    return super.visitJSXText(n);
  }
  visitJSXNamespacedName(n: JSXNamespacedName): JSXNamespacedName {
    console.log("visitJSXNamespacedName");
    return super.visitJSXNamespacedName(n);
  }
  visitJSXMemberExpression(n: JSXMemberExpression): JSXMemberExpression {
    console.log("visitJSXMemberExpression");
    return super.visitJSXMemberExpression(n);
  }
  visitJSXObject(n: JSXObject): JSXObject {
    console.log("visitJSXObject");
    return super.visitJSXObject(n);
  }
  visitJSXFragment(n: JSXFragment): JSXFragment {
    console.log("visitJSXFragment");
    return super.visitJSXFragment(n);
  }
  visitJSXClosingFragment(n: JSXClosingFragment): JSXClosingFragment {
    console.log("visitJSXClosingFragment");
    return super.visitJSXClosingFragment(n);
  }
  visitJSXElementChildren(nodes: JSXElementChild[]): JSXElementChild[] {
    console.log("visitJSXElementChildren");
    return super.visitJSXElementChildren(nodes);
  }
  visitJSXElementChild(n: JSXElementChild): JSXElementChild {
    console.log("visitJSXElementChild");
    return super.visitJSXElementChild(n);
  }
  visitJSXExpressionContainer(
    n: JSXExpressionContainer,
  ): JSXExpressionContainer {
    console.log("visitJSXExpressionContainer");
    return super.visitJSXExpressionContainer(n);
  }
  visitJSXSpreadChild(n: JSXSpreadChild): JSXElementChild {
    console.log("visitJSXSpreadChild");
    return super.visitJSXSpreadChild(n);
  }
  visitJSXOpeningFragment(n: JSXOpeningFragment): JSXOpeningFragment {
    console.log("visitJSXOpeningFragment");
    return super.visitJSXOpeningFragment(n);
  }
  visitJSXEmptyExpression(n: JSXEmptyExpression): Expression {
    console.log("visitJSXEmptyExpression");
    return super.visitJSXEmptyExpression(n);
  }
  visitJSXElement(n: JSXElement): JSXElement {
    console.log("visitJSXElement");
    return super.visitJSXElement(n);
  }
  visitJSXClosingElement(
    n: JSXClosingElement | undefined,
  ): JSXClosingElement | undefined {
    console.log("visitJSXClosingElement");
    return super.visitJSXClosingElement(n);
  }
  visitJSXElementName(n: JSXElementName): JSXElementName {
    console.log("visitJSXElementName");
    return super.visitJSXElementName(n);
  }
  visitJSXOpeningElement(n: JSXOpeningElement): JSXOpeningElement {
    console.log("visitJSXOpeningElement");
    return super.visitJSXOpeningElement(n);
  }
  visitJSXAttributes(
    attrs: JSXAttributeOrSpread[] | undefined,
  ): JSXAttributeOrSpread[] | undefined {
    console.log("visitJSXAttributes");
    return super.visitJSXAttributes(attrs);
  }
  visitJSXAttributeOrSpread(n: JSXAttributeOrSpread): JSXAttributeOrSpread {
    console.log("visitJSXAttributeOrSpread");
    return super.visitJSXAttributeOrSpread(n);
  }
  visitJSXAttributeOrSpreads(
    nodes: JSXAttributeOrSpread[],
  ): JSXAttributeOrSpread[] {
    console.log("visitJSXAttributeOrSpreads");
    return super.visitJSXAttributeOrSpreads(nodes);
  }
  visitJSXAttribute(n: JSXAttribute): JSXAttributeOrSpread {
    console.log("visitJSXAttribute");
    return super.visitJSXAttribute(n);
  }
  visitJSXAttributeValue(
    n: JSXAttrValue | undefined,
  ): JSXAttrValue | undefined {
    console.log("visitJSXAttributeValue");
    return super.visitJSXAttributeValue(n);
  }
  visitJSXAttributeName(n: JSXAttributeName): JSXAttributeName {
    console.log("visitJSXAttributeName");
    return super.visitJSXAttributeName(n);
  }
  visitConditionalExpression(n: ConditionalExpression): Expression {
    console.log("visitConditionalExpression");
    return super.visitConditionalExpression(n);
  }
  visitCallExpression(n: CallExpression): Expression {
    console.log("visitCallExpression");
    return super.visitCallExpression(n);
  }
  visitBooleanLiteral(n: BooleanLiteral): BooleanLiteral {
    console.log("visitBooleanLiteral");
    return super.visitBooleanLiteral(n);
  }
  visitBinaryExpression(n: BinaryExpression): Expression {
    console.log("visitBinaryExpression");
    return super.visitBinaryExpression(n);
  }
  visitAwaitExpression(n: AwaitExpression): Expression {
    console.log("visitAwaitExpression");
    return super.visitAwaitExpression(n);
  }
  visitTsTypeParameterDeclaration(
    n: TsTypeParameterDeclaration | undefined,
  ): TsTypeParameterDeclaration | undefined {
    console.log("visitTsTypeParameterDeclaration");
    return super.visitTsTypeParameterDeclaration(n);
  }
  visitTsTypeParameters(nodes: TsTypeParameter[]): TsTypeParameter[] {
    console.log("visitTsTypeParameters");
    return super.visitTsTypeParameters(nodes);
  }
  visitTsTypeParameter(n: TsTypeParameter): TsTypeParameter {
    console.log("visitTsTypeParameter");
    return super.visitTsTypeParameter(n);
  }
  visitTsTypeAnnotation(
    a: TsTypeAnnotation | undefined,
  ): TsTypeAnnotation | undefined {
    console.log("visitTsTypeAnnotation");
    return super.visitTsTypeAnnotation(a);
  }
  visitTsType(n: TsType): TsType {
    console.log("visitTsType");
    return n;
  }
  visitPatterns(nodes: Pattern[]): Pattern[] {
    console.log("visitPatterns");
    return super.visitPatterns(nodes);
  }
  visitImportDeclaration(n: ImportDeclaration): ImportDeclaration {
    console.log("visitImportDeclaration");
    return super.visitImportDeclaration(n);
  }
  visitImportSpecifiers(nodes: ImportSpecifier[]): ImportSpecifier[] {
    console.log("visitImportSpecifiers");
    return super.visitImportSpecifiers(nodes);
  }
  visitImportSpecifier(node: ImportSpecifier): ImportSpecifier {
    console.log("visitImportSpecifier");
    return super.visitImportSpecifier(node);
  }
  visitNamedImportSpecifier(node: NamedImportSpecifier): NamedImportSpecifier {
    console.log("visitNamedImportSpecifier");
    return super.visitNamedImportSpecifier(node);
  }
  visitImportNamespaceSpecifier(
    node: ImportNamespaceSpecifier,
  ): ImportNamespaceSpecifier {
    console.log("visitImportNamespaceSpecifier");
    return super.visitImportNamespaceSpecifier(node);
  }
  visitImportDefaultSpecifier(node: ImportDefaultSpecifier): ImportSpecifier {
    console.log("visitImportDefaultSpecifier");
    return super.visitImportDefaultSpecifier(node);
  }
  visitBindingIdentifier(i: Identifier): Identifier {
    console.log("visitBindingIdentifier");
    return super.visitBindingIdentifier(i);
  }
  visitIdentifierReference(i: Identifier): Identifier {
    console.log("visitIdentifierReference");
    return super.visitIdentifierReference(i);
  }
  visitLabelIdentifier(label: Identifier): Identifier {
    console.log("visitLabelIdentifier");
    return super.visitLabelIdentifier(label);
  }
  visitIdentifier(n: Identifier): Identifier {
    console.log("visitIdentifier");
    return super.visitIdentifier(n);
  }
  visitStringLiteral(n: StringLiteral): StringLiteral {
    console.log("visitStringLiteral");
    return super.visitStringLiteral(n);
  }
  visitNumericLiteral(n: NumericLiteral): NumericLiteral {
    console.log("visitNumericLiteral");
    return super.visitNumericLiteral(n);
  }
  visitBigIntLiteral(n: BigIntLiteral): BigIntLiteral {
    console.log("visitBigIntLiteral");
    return super.visitBigIntLiteral(n);
  }
  visitPattern(n: Pattern): Pattern {
    console.log("visitPattern");
    return super.visitPattern(n);
  }
  visitRestElement(n: RestElement): RestElement {
    console.log("visitRestElement");
    return super.visitRestElement(n);
  }
  visitAssignmentPattern(n: AssignmentPattern): Pattern {
    console.log("visitAssignmentPattern");
    return super.visitAssignmentPattern(n);
  }
  visitObjectPattern(n: ObjectPattern): Pattern {
    console.log("visitObjectPattern");
    return super.visitObjectPattern(n);
  }
  visitObjectPatternProperties(
    nodes: ObjectPatternProperty[],
  ): ObjectPatternProperty[] {
    console.log("visitObjectPatternProperties");
    return super.visitObjectPatternProperties(nodes);
  }
  visitObjectPatternProperty(n: ObjectPatternProperty): ObjectPatternProperty {
    console.log("visitObjectPatternProperty");
    return super.visitObjectPatternProperty(n);
  }
  visitKeyValuePatternProperty(
    n: KeyValuePatternProperty,
  ): ObjectPatternProperty {
    console.log("visitKeyValuePatternProperty");
    return super.visitKeyValuePatternProperty(n);
  }
  visitAssignmentPatternProperty(
    n: AssignmentPatternProperty,
  ): ObjectPatternProperty {
    console.log("visitAssignmentPatternProperty");
    return super.visitAssignmentPatternProperty(n);
  }
  visitArrayPattern(n: ArrayPattern): Pattern {
    console.log("visitArrayPattern");
    return super.visitArrayPattern(n);
  }
  visitArrayPatternElements(
    nodes: (Pattern | undefined)[],
  ): (Pattern | undefined)[] {
    console.log("visitArrayPatternElements");
    return super.visitArrayPatternElements(nodes);
  }
  visitArrayPatternElement(n: Pattern | undefined): Pattern | undefined {
    console.log("visitArrayPatternElement");
    return super.visitArrayPatternElement(n);
  }
}

// ts-unused-exports:disable-next-line
export default function defaultVisitor() {
  return (program: Program) => new DefaultVisitor().visitProgram(program);
}
