import { inject, injectable } from "tsyringe";

import { ICarsRepository } from "@modules/cars/repositories/ICarsRepository";
import { Rental } from "@modules/rentals/infra/typeorm/entities/Rental";
import { IRentalsRepository } from "@modules/rentals/repositories/IRentalsRepository";
import { IDateProvider } from "@shared/container/providers/DateProvider/IDateProvider";
import { AppError } from "@shared/errors/AppError";

interface IRequest {
  id: string;
  user_id: string;
}

@injectable()
class DevolutionRentalUseCase {
  constructor(
    @inject("RentalsRepository")
    private rentalsRepository: IRentalsRepository,
    @inject("CarsRepository")
    private carsRepository: ICarsRepository,
    @inject("DateProvider")
    private dateProvider: IDateProvider
  ) {}

  async execute({ id }: IRequest): Promise<Rental> {
    const minimum_daily = 1;
    const rental = await this.rentalsRepository.findById(id);

    if (!rental) {
      throw new AppError("Rental does not exists!");
    }

    const car = await this.carsRepository.findById(rental.car_id);

    const dateNow = this.dateProvider.dateNow();

    let daily = this.dateProvider.compareInDays(rental.start_date, dateNow);

    if (daily < minimum_daily) {
      daily = minimum_daily;
    }

    const delay = this.dateProvider.compareInDays(
      dateNow,
      rental.expected_return_date
    );

    let total: number;

    if (delay) {
      const calculate_fine = delay * car.fine_amount;
      total = calculate_fine;
    }

    total += daily * car.daily_rate;

    rental.end_date = this.dateProvider.dateNow();
    rental.total = total;

    await this.rentalsRepository.create(rental);

    await this.carsRepository.updateAvailable(car.id, true);

    return rental;
  }
}

export { DevolutionRentalUseCase };
