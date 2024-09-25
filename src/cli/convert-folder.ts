import { findInDir, readFile, writeFile } from '../utils';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { convert } from '../convert';
import { formatCode } from './format-code';

const convertFile = async (filePath: string) => {
	const fileContent = await readFile(filePath);
	return convert(fileContent);
};

export const convertFolder = async (folderPath: string) => {
	try {
		const files = findInDir(folderPath);

		if (files.length === 0) {
			console.warn(chalk.yellow('⚠ No Vue files found in the directory'));
			return;
		}
		let value = 0;

		const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
		bar.start(files.length, 0);
		const resultAll = { success: 0, err: 0 };
		const errors: string[] = [];

		for (const filePath of files) {
			value++;
			try {
				const result = await convertFile(filePath);

				if (result.isOk) {
					resultAll.success++;
					const format = await formatCode(result.content, filePath);
					await writeFile(filePath, format);
				} else {
					resultAll.err++;
					errors.push(result.errors.join('\n'));
				}
			} catch (e) {
				resultAll.err++;
			}
			bar.update(value);
		}
		bar.stop();
		console.log(chalk.green('✔ Conversion completed.'));
		if (resultAll.success) {
			console.log(chalk.green(`✔ Successfully converted ${resultAll.success} files`));
		}

		if (resultAll.err) {
			console.log(chalk.yellow(`⚠ ${resultAll.err} files could not be converted`));
			console.log(chalk.yellow(errors.join('\n')));
		}
	} catch (e) {
		console.error(chalk.red(`✖ Error converting files in directory: ${(e as Error).message}`));
	}
};
