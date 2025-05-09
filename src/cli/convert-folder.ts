import { findInDir, readFile, writeFile } from '../utils';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { convert } from '../convert';
import { formatCode } from './format-code';
import { ConvertFileOptions, ConvertOptions, PropsStyle } from '../convert/types';

const convertFile = async (filePath: string, options: ConvertOptions) => {
	const fileContent = await readFile(filePath);
	return convert(fileContent, options);
};

export const convertFolder = async (folderPath: string, options: ConvertFileOptions) => {
	try {
		const start = performance.now();
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
		const { view = false, propsOptionsLike = false, propsStyle = PropsStyle.WithDefaults } = options ?? {};

		for (const filePath of files) {
			value++;
			try {
				const result = await convertFile(filePath, { propsOptionsLike, propsStyle });

				if (result.isOk) {
					resultAll.success++;
					const format = await formatCode(result.content, filePath);
					if (view) {
						console.log(format);
					} else {
						await writeFile(filePath, format);
					}
				} else {
					resultAll.err++;
					errors.push(`${filePath} - ${result.errors.join('\n')}`);
				}
			} catch (e) {
				resultAll.err++;
			}
			bar.update(value);
		}
		bar.stop();

		const stop = performance.now();
		const inSeconds = (stop - start) / 1000;
		const rounded = Number(inSeconds).toFixed(3);

		if (resultAll.success) {
			console.log(chalk.green(`✔ Successfully converted ${resultAll.success} files in ${rounded}s.`));
		}

		if (resultAll.err) {
			console.log(chalk.yellow(`⚠ ${resultAll.err} files could not be converted`));
			console.log(chalk.yellow(errors.join('\n')));
		}
	} catch (e) {
		console.error(chalk.red(`✖ Error converting files in directory: ${(e as Error)?.message}`));
	}
};
