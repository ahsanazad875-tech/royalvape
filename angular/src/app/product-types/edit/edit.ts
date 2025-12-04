import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CreateUpdateProductTypeDto, ProductTypeDto, ProductTypeService } from 'src/app/proxy/product-types';

@Component({
  selector: 'app-product-types-edit',
   imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './edit.html'
})
export class Edit implements OnInit {
  id?: string | null;
  vm: CreateUpdateProductTypeDto = {} as any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ProductTypeService
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.service.get(this.id).subscribe((t: ProductTypeDto) => {
        this.vm = { type: t.type!, typeDesc: t.typeDesc };
      });
    }
  }

  save() {
    const req = this.id
      ? this.service.update(this.id!, this.vm)
      : this.service.create(this.vm);

    req.subscribe(() => this.router.navigateByUrl('/product-types'));
  }
}

