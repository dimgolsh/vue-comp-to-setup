import traverse from '@babel/traverse';
import { ParseResult } from '@babel/parser';
import * as t from '@babel/types';

export const getImports = (ast: ParseResult<t.File>) => {
	const excludesNamesImportSpecifier = ['defineComponent', 'PropType'];
	const excludesNamesSource = ['vue'];

	// Remove excluded imports
	traverse(ast, {
		ImportSpecifier(node) {
			if (t.isIdentifier(node.node.imported)) {
				if (excludesNamesImportSpecifier.includes(node.node.imported.name)) {
					node.remove();
				}
			}
		},
	});

	traverse(ast, {
		ImportDeclaration(node) {
			const isExcludeSource = excludesNamesSource.includes(node.node.source.value);
			if (node.node.specifiers.length === 0 && isExcludeSource) {
				node.remove();
			}
		},
	});

	const imports = ast.program.body.filter((n) => t.isImportDeclaration(n));

	return imports;
};

export const addImport = (imports: t.ImportDeclaration[], value: { source: string; specifier: string }) => {
	const findImport = imports.findIndex((importDeclaration) => {
		return importDeclaration.source.value === value.source;
	});

	if (findImport === -1) {
		imports.push(
			t.importDeclaration(
				[t.importSpecifier(t.identifier(value.specifier), t.identifier(value.specifier))],
				t.stringLiteral(value.source),
			),
		);
	} else {
		imports[findImport].specifiers.push(t.importDefaultSpecifier(t.identifier(value.specifier)));
	}

	return imports;
};
