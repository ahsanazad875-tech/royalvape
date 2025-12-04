import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BranchDto, BranchService } from 'src/app/proxy/branches';
import { ConfirmationService } from '@abp/ng.theme.shared';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-branch-edit',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './edit.html',
  styleUrls: ['./edit.scss'],
})
export class Edit implements OnInit {
  id: string | null = null;
  isEdit = false;
  loading = false;
  saving = false;
  deleting = false;

  // add vatPerc to vm (percentage 0–100)
  vm: { name: string; code: string; isActive: boolean; vatPerc: number } = {
    name: '',
    code: '',
    isActive: true,
    vatPerc: 0,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: BranchService,
    private confirmation: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.id;
    if (this.isEdit) this.load();
  }

  private load() {
    if (!this.id) return;
    this.loading = true;
    this.service.get(this.id).subscribe({
      next: (res: BranchDto) => {
        this.vm = {
          name: res.name ?? '',
          code: (res as any).code ?? '',
          isActive: (res as any).isActive ?? true,
          vatPerc: this.parseVatPerc((res as any).vatPerc),
        };
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  // Normalize/clamp VAT% to [0, 100] with 2-decimal precision
  private parseVatPerc(val: any): number {
    const n = Number(val);
    if (isNaN(n)) return 0;
    const clamped = Math.max(0, Math.min(100, n));
    return Math.round(clamped * 100) / 100;
  }

onVatChange() {
  const n = Number(this.vm.vatPerc);
  if (isNaN(n)) this.vm.vatPerc = 0;
  else this.vm.vatPerc = Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

  save() {
    if (this.saving || this.deleting) return;
    this.saving = true;

    const payload = {
      code: this.vm.code?.trim(),
      name: this.vm.name?.trim(),
      isActive: this.vm.isActive,
      vatPerc: this.parseVatPerc(this.vm.vatPerc), // <- include VAT%
    } as any; // matches CreateUpdateBranchDto: { code, name, isActive, vatPerc }

    const req$ =
      this.isEdit && this.id
        ? this.service.update(this.id, payload)
        : this.service.create(payload);

    req$.subscribe({
      next: () => this.router.navigate(['/branches']),
      error: () => (this.saving = false),
      complete: () => (this.saving = false),
    });
  }

  confirmDelete() {
    if (!this.id || this.deleting || this.saving) return;
    this.confirmation.warn('Delete this branch?', 'Are you sure?').subscribe(result => {
      if (result === 'confirm') this.delete();
    });
  }

  private delete() {
    if (!this.id) return;
    this.deleting = true;
    this.service.delete(this.id).subscribe({
      next: () => this.router.navigate(['/branches']),
      error: () => (this.deleting = false),
      complete: () => (this.deleting = false),
    });
  }
}
