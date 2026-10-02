import fs from 'fs';

const filePath = './pages/TechnicalOffice.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `                  <div className="mt-16 mb-8 grid grid-cols-4 gap-8 text-center text-xs font-bold text-slate-800 break-inside-avoid">
                    <div>
                      <p className="mb-16">بخش مهندسی و دفتر فنی پیمانکار</p>
                      <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5">
                        نام، مهر و امضاء
                      </p>
                    </div>
                    <div>
                      <p className="mb-16">رئیس کارگاه / مدیر پروژه</p>
                      <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5">
                        نام، مهر و امضاء
                      </p>
                    </div>
                    <div>
                      <p className="mb-16">مهندسین مشاور / دستگاه نظارت مقیم</p>
                      <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5">
                        نام، مهر و امضاء
                      </p>
                    </div>
                    <div>
                      <p className="mb-16">نماینده کارفرما / مجری</p>
                      <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5">
                        نام، مهر و امضاء
                      </p>
                    </div>
                  </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, "");
  fs.writeFileSync(filePath, content);
  console.log('Update successful');
} else {
  console.log('Target string not found');
}
