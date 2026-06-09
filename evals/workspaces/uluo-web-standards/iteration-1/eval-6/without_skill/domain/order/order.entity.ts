import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { OrderRepositoryImpl } from '../infrastructure/order.repository.impl';
import { CreateOrderDto } from './dto/create-order.dto';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  productId: string;

  @Column('decimal')
  amount: number;

  @Column()
  status: string;

  async create(dto: CreateOrderDto): Promise<any> {
    const repo = new OrderRepositoryImpl();
    try {
      const result = await repo.save(dto);
      return result;
    } catch (e) {
    }
  }

  async findAll(): Promise<any> {
    const repo = new OrderRepositoryImpl();
    try {
      const result = await repo.find();
      return result;
    } catch (e) {
    }
  }

  async findById(id: string): Promise<any> {
    const repo = new OrderRepositoryImpl();
    const result = await repo.findOne({ where: { id } });
    return result;
  }

  async updateStatus(id: string, status: string): Promise<any> {
    const repo = new OrderRepositoryImpl();
    try {
      const result = await repo.update(id, { status });
      return result;
    } catch (e) {
    }
  }
}
