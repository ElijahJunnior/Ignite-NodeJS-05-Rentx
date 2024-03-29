import { parse } from "csv-parse";
import fs from "fs";
import { inject, injectable } from "tsyringe";

import { ICategoriesRepository } from "@modules/cars/repositories/ICategoriesRepository";

interface IImportCategories {
  name: string;
  description: string;
}

@injectable()
class ImportCategoryUseCase {
  constructor(
    @inject("CategoriesRepository")
    private repository: ICategoriesRepository
  ) {}

  loadCategories(file: Express.Multer.File): Promise<IImportCategories[]> {
    return new Promise((resolve, reject) => {
      const categories: IImportCategories[] = [];

      // cria um stream para o aquivo informado
      const stream = fs.createReadStream(file.path);

      // cria um coversor de csv para array
      const parseFile = parse();

      // informa ao conversor oque deve fazer com o resultado da conversão
      // a função será executada sempre que novos dados forem lidos
      // nesse caso os dados serão recebidos linha a linha
      parseFile
        .on("data", async (line) => {
          const [name, description] = line;
          categories.push({
            name,
            description,
          });
        })
        .on("end", () => {
          fs.promises.unlink(file.path);
          resolve(categories);
        })
        .on("error", (err) => {
          reject(err);
        });

      // informa ao stream que função deve ser executada a cada pipe lido
      // nesse caso os pipes são linhas do csv
      stream.pipe(parseFile);
    });
  }

  async execute(file: Express.Multer.File): Promise<void> {
    const categories = await this.loadCategories(file);
    categories.map(async (category) => {
      const { name, description } = category;

      const existsCategory = await this.repository.findByName(name);

      if (!existsCategory) {
        await this.repository.create({
          name,
          description,
        });
      }
    });
  }
}

export { ImportCategoryUseCase };
