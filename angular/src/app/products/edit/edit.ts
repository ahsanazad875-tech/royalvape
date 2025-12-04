import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { EnvironmentService } from '@abp/ng.core';

import { ProductTypeDto, ProductTypeService } from 'src/app/proxy/product-types';
import {
  CreateUpdateProductDto,
  ProductDto,
  ProductService,
  UoMEnum,
} from 'src/app/proxy/products';
import { FileService } from 'src/app/proxy/files/file.service'; // Generated ABP proxy

type UomOption = { value: any; label: string };

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './edit.html'
})
export class Edit implements OnInit, OnDestroy {
  id?: string | null;
  vm: CreateUpdateProductDto = {} as any;
  types: ProductTypeDto[] = [];
  uomOptions: UomOption[] = [];

  // ---- Image state
  pendingFile: File | null = null;         // new file not yet uploaded
  previewUrl: string | null = null;        // local preview for newly picked image
  existingImageUrl: string | null = null;  // absolute URL for display
  saving = false;

  private apiBase = this.env.getEnvironment().apis.default.url?.replace(/\/+$/, '') ?? '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: ProductService,
    private typeSvc: ProductTypeService,
    private fileSvc: FileService,  // use generated proxy
    private env: EnvironmentService
  ) {}

  ngOnInit() {
    this.uomOptions = this.buildUomOptions();

    this.id = this.route.snapshot.paramMap.get('id');
    this.typeSvc.getList({ skipCount: 0, maxResultCount: 100 })
      .subscribe(x => (this.types = x.items));

    if (this.id) {
      this.svc.get(this.id).subscribe((p: ProductDto) => {
        this.vm = {
          productNo: p.productNo,
          productName: p.productName ?? '',
          productDesc: p.productDesc,
          buyingUnitPrice: p.buyingUnitPrice,
          sellingUnitPrice: p.sellingUnitPrice,
          uoM: p.uoM,
          productTypeId: p.productTypeId,
          ...(p as any).imageUrl ? { imageUrl: (p as any).imageUrl } : {}
        };
        // convert stored (likely relative) URL to absolute for display
        this.existingImageUrl = this.imgUrl((p as any).imageUrl ?? null);
      });
    } else {
      this.vm = {
        productNo: '',
        productName: '',
        productDesc: '',
        buyingUnitPrice: 0,
        sellingUnitPrice: 0,
        uoM: (UoMEnum as any).Piece ?? 'Piece',
        productTypeId: '' as any
      };
      this.existingImageUrl = null;
    }
  }

  ngOnDestroy(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  }

  // ---- File handlers
  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);

    this.pendingFile = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  removeImage() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.pendingFile = null;
  }

  // ---- Save flow
  save() {
    this.saving = true;
    this.vm.uoM = this.normalizeUom(this.vm.uoM);

    const finish = () => {
      this.saving = false;
      this.router.navigateByUrl('/products');
    };

    // EDIT flow (id exists)
    if (this.id) {
      const afterUpload = (url?: string) => {
        if (url) {
          (this.vm as any).imageUrl = url;
          this.existingImageUrl = this.imgUrl(url);  // update display
        } else if (this.existingImageUrl && !(this.vm as any).imageUrl) {
          (this.vm as any).imageUrl = (this.vm as any).imageUrl ?? undefined; // no change
        }

        this.svc.update(this.id!, this.vm)
          .pipe(finalize(() => (this.saving = false)))
          .subscribe(() => this.router.navigateByUrl('/products'));
      };

      if (this.pendingFile) {
        this.fileSvc
          .uploadForProduct(this.id!, this.buildFormData(this.pendingFile)) // FormData required by proxy
          .subscribe({
            next: (url) => afterUpload(url),
            error: () => (this.saving = false)
          });
      } else {
        afterUpload();
      }
      return;
    }

    // CREATE flow (no id yet) - upload temp first if user picked an image
    const createWith = (url?: string) => {
      if (url) {
        (this.vm as any).imageUrl = url;             // store relative from server
        this.existingImageUrl = this.imgUrl(url);    // so it shows immediately if we stayed on page
      }

      this.svc.create(this.vm)
        .pipe(finalize(() => (this.saving = false)))
        .subscribe(() => this.router.navigateByUrl('/products'));
    };

    if (this.pendingFile) {
      this.fileSvc
        .uploadTemp(this.buildFormData(this.pendingFile))
        .subscribe({
          next: (url) => createWith(url),
          error: () => (this.saving = false)
        });
    } else {
      createWith();
    }
  }

  // Optional delete (edit mode)
  deleteImage() {
    if (!this.id) return;
    this.saving = true;

    this.fileSvc.deleteProductImage(this.id).subscribe({
      next: () => {
        if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = null;
        this.pendingFile = null;
        this.existingImageUrl = null;
        (this.vm as any).imageUrl = null;
        this.saving = false;
      },
      error: () => (this.saving = false)
    });
  }

  // ---- Helpers
  private buildUomOptions(): UomOption[] {
    const e = UoMEnum as any;
    const keys = Object.keys(e).filter(k => isNaN(Number(k)));
    return keys.map(k => ({
      value: e[k],
      label: this.pretty(k)
    }));
  }

  private normalizeUom(value: any): any {
    if (typeof (UoMEnum as any).Piece === 'number' && typeof value === 'string' && /^\d+$/.test(value)) {
      return Number(value);
    }
    return value;
  }

  private pretty(key: string): string {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // ABP proxy expects FormData for IRemoteStreamContent
  private buildFormData(file: File, fieldName = 'file'): FormData {
    const fd = new FormData();
    fd.append(fieldName, file, file.name);
    return fd;
  }

  // Convert relative URL (/uploads/...) to absolute (https://host/uploads/...)
  imgUrl(url?: string | null): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url; // already absolute
    const rel = url.startsWith('/') ? url : `/${url}`;
    return `${this.apiBase}${rel}`;
  }
}
