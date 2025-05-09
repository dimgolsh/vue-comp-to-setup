import { isSFC, parseVueFromContent, wrapNewLineComment } from '../../utils';
import { ConvertResult } from '../../types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { convertObjectProperty, replacePropsMemberExpression } from '../../defineProps';
import generate from '@babel/generator';
import { generateVue } from '../../generateVue';
import { formatCode } from '../../formatCode';

const isDefineProps = (path: t.CallExpression) => {
	return t.isCallExpression(path) && t.isIdentifier(path.callee) && path.callee.name === 'defineProps';
};

const convertProps = async (content: string) => {
	const ast = parse(content, {
		sourceType: 'module',
		plugins: ['typescript'],
		attachComment: true,
	});

	let properties: t.ObjectProperty[] = [];

	// Get properties from withDefaults
	traverse(ast, {
		CallExpression(path) {
			if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'withDefaults') {
				const params = path.node.arguments[1];
				if (t.isObjectExpression(params)) {
					const members = params.properties.filter((prop) => t.isObjectProperty(prop));
					properties = members.map(convertObjectProperty);
				}
			}
		},
	});

	// Get properties from defineProps
	traverse(ast, {
		TSTypeParameterInstantiation(path) {
			if (t.isCallExpression(path.parent) && isDefineProps(path.parent)) {
				const params = path.node.params[0] as t.TSTypeLiteral;
				const members = params?.members.filter((member) => t.isTSPropertySignature(member));
				const filtered = members?.filter(
					(member) => !properties.find((prop) => (prop.key as t.Identifier).name === (member.key as t.Identifier).name),
				);
				properties.push(...filtered?.map((member) => t.objectProperty(member.key, member.key, false, true)));
			}
		},
	});

	// Replace withDefaults with defineProps
	traverse(ast, {
		CallExpression(path) {
			if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'withDefaults') {
				const defineProps = path.node.arguments[0] as t.CallExpression;
				path.replaceWith(defineProps);
			}
		},
	});

	// Replace const props = defineProps() with defineProps
	traverse(ast, {
		VariableDeclaration(path) {
			const decl = path.node.declarations[0];
			if (t.isVariableDeclarator(decl) && isDefineProps(decl.init as t.CallExpression)) {
				path.replaceWith(decl.init);
			}
		},
	});

	// Add const {...} = defineProps()
	traverse(ast, {
		ExpressionStatement(path) {
			if (t.isCallExpression(path.node.expression) && isDefineProps(path.node.expression)) {
				const pattern = t.variableDeclarator(t.objectPattern(properties), path.node.expression);
				const decl = t.variableDeclaration('const', [pattern]);
				path.replaceWith(decl);
			}
		},
	});

	return ast;
};

// old name
export const withDefaultsPropsToReactivityProps = async (content: string): Promise<ConvertResult> => {
	if (!content) {
		return {
			isOk: false,
			content: '',
			errors: ['⚠ File is empty'],
		};
	}

	try {
		if (!isSFC(content)) {
			const newAst = await convertProps(content);
			const code = generate(newAst, { jsescOption: { quotes: 'single' } }).code;

			return {
				isOk: true,
				content: code,
				errors: [],
			};
		} else {
			const desc = parseVueFromContent(content);

			if (!desc.scriptSetup) {
				return {
					isOk: false,
					content: '',
					errors: ['⚠ Vue file is not contain script setup'],
				};
			}

			const newAst = await convertProps(desc.scriptSetup.content);
			replacePropsMemberExpression(newAst);

			const imports = newAst.program.body.filter((n) => t.isImportDeclaration(n));
			const body = newAst.program.body.filter((n) => !t.isImportDeclaration(n));

			const newAstFormate = t.program([...imports, ...body.map((n) => wrapNewLineComment(n))]);
			const code = generate(newAstFormate, { jsescOption: { quotes: 'single' } }).code;
			const rawVue = generateVue(desc, code);
			const format = await formatCode(rawVue);

			return {
				isOk: true,
				content: format,
				errors: [],
			};
		}
	} catch (e) {
		console.log(e);
		console.error('\n Failed to convert \n');
		return {
			isOk: false,
			content: '',
			errors: ['⚠ Failed to convert', e.toString()],
		};
	}
};

export const definePropsToReactivityProps = async (content: string): Promise<ConvertResult> => {
	return withDefaultsPropsToReactivityProps(content);
};
